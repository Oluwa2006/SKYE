import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const maxDuration = 30;

// ─── Research a public company from its website ───────────────────────────────
// Fetches the homepage + a few key pages, sends content to GPT-4o,
// and returns pre-filled form fields for the onboarding flow.

async function fetchPageText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AgenticaBot/1.0)" },
      signal:  AbortSignal.timeout(8000),
    });
    if (!res.ok) return "";
    const html = await res.text();
    // Strip tags and collapse whitespace — rough but effective
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 6000); // cap tokens
  } catch {
    return "";
  }
}

function normaliseUrl(raw: string): string {
  let url = raw.trim();
  if (!url.startsWith("http")) url = "https://" + url;
  return url;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { url, company_name } = body as { url?: string; company_name?: string };

  if (!url && !company_name) {
    return NextResponse.json({ error: "url or company_name is required" }, { status: 400 });
  }

  // Try fetching the website
  let pageContent = "";
  let resolvedUrl = "";
  if (url) {
    resolvedUrl = normaliseUrl(url);
    pageContent = await fetchPageText(resolvedUrl);

    // Also try /about if homepage is thin
    if (pageContent.length < 500) {
      const aboutContent = await fetchPageText(resolvedUrl.replace(/\/$/, "") + "/about");
      pageContent += " " + aboutContent;
    }
  }

  const prompt = `You are a business analyst. Based on the information below, extract a clear company profile.

Company name: ${company_name || "Unknown"}
Website: ${resolvedUrl || "Not provided"}
Page content: ${pageContent || "(website could not be fetched — use company name to infer)"}

Return ONLY valid JSON:
{
  "company_name": "<official company name>",
  "website": "<website URL>",
  "description": "<2-3 sentence description of what they do, who they serve, and what makes them different. Written in first person as if the founder is describing it.>",
  "audience": "<specific target audience description — age, role, pain point>",
  "goals": "<inferred primary business/marketing goal e.g. 'grow brand awareness among Gen Z', 'drive app downloads', 'increase DTC sales'>",
  "confidence": "<'high' if website was fetched and content was clear | 'medium' if partial data | 'low' if guessed from name only>"
}`;

  try {
    const response = await openai.chat.completions.create({
      model:       "gpt-4o",
      messages:    [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens:  600,
    });

    const raw   = response.choices[0].message.content?.trim() ?? "";
    const clean = raw.replace(/^```json\s*/i, "").replace(/\n?```$/i, "").trim();
    const parsed = JSON.parse(clean);
    return NextResponse.json(parsed);

  } catch (err) {
    const message = err instanceof Error ? err.message : "Research failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
