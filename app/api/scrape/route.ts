import { NextResponse } from "next/server";
import { chromium } from "playwright";
import { createHash } from "crypto";
import { supabase } from "@/lib/supabase";

// ─── Traction scoring (text-based fallback) ──────────────────────────────────

const OFFER_TERMS = ["deal", "save", "discount", "free", "off", "promo", "bogo", "buy one", "limited", "exclusive"];
const URGENCY_TERMS = ["today only", "ends soon", "last chance", "hurry", "limited time", "expires", "while supplies"];
const CTA_TERMS = ["order now", "get it", "try it", "visit us", "click", "order today", "shop now", "grab"];

function computeTractionScore(text: string): number {
  const lower = text.toLowerCase();
  let score = 0;

  // Offer language: +10 per match
  for (const term of OFFER_TERMS) {
    if (lower.includes(term)) score += 10;
  }

  // Urgency language: +15 per match
  for (const term of URGENCY_TERMS) {
    if (lower.includes(term)) score += 15;
  }

  // CTA language: +8 per match
  for (const term of CTA_TERMS) {
    if (lower.includes(term)) score += 8;
  }

  // Content richness: up to +10
  if (text.length > 500) score += 5;
  if (text.length > 1000) score += 5;

  return Math.min(score, 100);
}

function computeContentHash(text: string): string {
  return createHash("sha256").update(text.trim().toLowerCase()).digest("hex").slice(0, 32);
}

// ─── Page extraction ──────────────────────────────────────────────────────────

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
  const captionParts = [metaDescription, ...headings.slice(0, 3), ...paragraphs.slice(0, 2)].filter(Boolean);
  const caption = captionParts.join(" | ").slice(0, 2000) || title;

  return {
    title,
    currentUrl,
    hook,
    caption,
    raw_data: { title, metaDescription, h1, headings, paragraphs, currentUrl },
  };
}

// ─── Blocked page detection ───────────────────────────────────────────────────

function isBlocked(title: string, caption: string): boolean {
  const t = title.toLowerCase();
  const c = caption.toLowerCase();
  return (
    t.includes("attention required") ||
    t.includes("just a moment") ||
    t.includes("access denied") ||
    c.includes("cloudflare") ||
    c.includes("security verification") ||
    c.includes("sorry, you have been blocked")
  );
}

// ─── Main route ───────────────────────────────────────────────────────────────

export async function GET() {
  const { data: sources, error } = await supabase
    .from("sources")
    .select("*")
    .eq("active", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!sources || sources.length === 0) {
    return NextResponse.json({ error: "No active sources found" }, { status: 404 });
  }

  const browser = await chromium.launch({ headless: true });
  const results: any[] = [];

  try {
    for (const source of sources) {
      const page = await browser.newPage();
      let scrapeStatus = "ok";

      try {
        await page.goto(source.url, { waitUntil: "domcontentloaded", timeout: 30000 });

        const { title, currentUrl, hook, caption, raw_data } = await extractPageContent(page);

        // Blocked page check
        if (isBlocked(title, caption)) {
          scrapeStatus = "blocked";
          results.push({ source: source.name, status: "skipped", reason: "Blocked or verification page" });
          await page.close();
          continue;
        }

        // Content hash deduplication
        const contentHash = computeContentHash(caption);

        const { data: hashMatch } = await supabase
          .from("posts")
          .select("id")
          .eq("source_id", source.id)
          .eq("content_hash", contentHash)
          .limit(1);

        if (hashMatch && hashMatch.length > 0) {
          results.push({ source: source.name, status: "skipped", reason: "Duplicate content (hash match)" });
          await page.close();
          continue;
        }

        // URL deduplication
        const { data: urlMatch } = await supabase
          .from("posts")
          .select("id")
          .eq("source_id", source.id)
          .eq("post_url", currentUrl)
          .limit(1);

        if (urlMatch && urlMatch.length > 0) {
          results.push({ source: source.name, status: "skipped", reason: "Duplicate URL" });
          await page.close();
          continue;
        }

        // Compute traction score from text signals
        const tractionScore = computeTractionScore(caption);

        // Save post
        const { data: savedPost, error: insertError } = await supabase
          .from("posts")
          .insert([{
            source_id: source.id,
            post_url: currentUrl,
            caption,
            hook,
            media_type: "webpage",
            raw_data,
            content_hash: contentHash,
            traction_score: tractionScore,
          }])
          .select()
          .single();

        if (insertError) {
          scrapeStatus = "error";
          results.push({ source: source.name, status: "error", reason: insertError.message });
          await page.close();
          continue;
        }

        results.push({
          source: source.name,
          status: "saved",
          postId: savedPost.id,
          hook,
          tractionScore,
        });
      } catch (err) {
        scrapeStatus = "error";
        results.push({
          source: source.name,
          status: "error",
          reason: err instanceof Error ? err.message : "Scrape failed",
        });
      } finally {
        await page.close();

        // Update source status
        await supabase
          .from("sources")
          .update({
            last_scraped_at: new Date().toISOString(),
            last_scrape_status: scrapeStatus,
          })
          .eq("id", source.id);
      }
    }

    return NextResponse.json({ success: true, processedSources: results.length, results });
  } finally {
    await browser.close();
  }
}
