import { NextResponse } from "next/server";
import { chromium } from "playwright";
import { supabase } from "@/lib/supabase";

async function extractPageContent(page: any) {
  const title = await page.title();
  const currentUrl = page.url();

  const metaDescription = await page
    .$eval('meta[name="description"]', (el: any) => el.getAttribute("content"))
    .catch(() => "");

  const h1 = await page
    .$eval("h1", (el: any) => el.innerText?.trim())
    .catch(() => "");

  const headings = await page
    .$$eval("h2, h3", (els: any[]) =>
      els
        .map((el) => el.innerText?.trim())
        .filter((t: string) => t && t.length > 5 && t.length < 120)
        .slice(0, 8)
    )
    .catch(() => []);

  const paragraphs = await page
    .$$eval("p", (els: any[]) =>
      els
        .map((el) => el.innerText?.trim())
        .filter((t: string) => t && t.length > 60 && t.length < 600)
        .slice(0, 6)
    )
    .catch(() => []);

  const hook = h1 || title;

  const captionParts = [
    metaDescription,
    ...headings.slice(0, 3),
    ...paragraphs.slice(0, 2),
  ].filter(Boolean);

  const caption = captionParts.join(" | ").slice(0, 2000) || title;

  return {
    title,
    currentUrl,
    hook,
    caption,
    raw_data: {
      title,
      metaDescription,
      h1,
      headings,
      paragraphs,
      currentUrl,
    },
  };
}

export async function GET() {
  const { data: sources, error } = await supabase
    .from("sources")
    .select("*");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!sources || sources.length === 0) {
    return NextResponse.json({ error: "No sources found" }, { status: 404 });
  }

  const browser = await chromium.launch({ headless: true });
  const results: any[] = [];

  try {
    for (const source of sources) {
      const page = await browser.newPage();

      try {
        await page.goto(source.url, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });

        const { title, currentUrl, hook, caption, raw_data } =
          await extractPageContent(page);

        const lowerTitle = title.toLowerCase();
        const lowerCaption = caption.toLowerCase();
        const isBlockedPage =
          lowerTitle.includes("attention required") ||
          lowerTitle.includes("just a moment") ||
          lowerCaption.includes("cloudflare") ||
          lowerCaption.includes("security verification") ||
          lowerCaption.includes("sorry, you have been blocked");

        if (isBlockedPage) {
          results.push({ source: source.name, status: "skipped", reason: "Blocked or verification page" });
          await page.close();
          continue;
        }

        const { data: existingPost, error: existingError } = await supabase
          .from("posts")
          .select("id")
          .eq("source_id", source.id)
          .eq("post_url", currentUrl)
          .limit(1);

        if (existingError) {
          results.push({ source: source.name, status: "error", reason: existingError.message });
          await page.close();
          continue;
        }

        if (existingPost && existingPost.length > 0) {
          results.push({ source: source.name, status: "skipped", reason: "Post already exists" });
          await page.close();
          continue;
        }

        const { data: savedPost, error: insertError } = await supabase
          .from("posts")
          .insert([
            {
              source_id: source.id,
              post_url: currentUrl,
              caption,
              hook,
              media_type: "webpage",
              raw_data,
            },
          ])
          .select()
          .single();

        if (insertError) {
          results.push({ source: source.name, status: "error", reason: insertError.message });
          await page.close();
          continue;
        }

        results.push({ source: source.name, status: "saved", postId: savedPost.id, hook });
      } catch (err) {
        results.push({
          source: source.name,
          status: "error",
          reason: err instanceof Error ? err.message : "Scrape failed",
        });
      } finally {
        await page.close();
      }
    }

    return NextResponse.json({
      success: true,
      processedSources: results.length,
      results,
    });
  } finally {
    await browser.close();
  }
}
