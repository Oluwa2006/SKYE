import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { openai } from "@/lib/openai";

function buildPrompt(post: any): string {
  const raw = post.raw_data ?? {};

  const sections = [
    `Page Title: ${raw.title || post.hook || ""}`,
    `Meta Description: ${raw.metaDescription || ""}`,
    `Main Headline (H1): ${raw.h1 || ""}`,
    `Section Headings: ${(raw.headings ?? []).join(" | ")}`,
    `Body Copy:\n${(raw.paragraphs ?? []).join("\n")}`,
  ]
    .filter((line) => {
      const value = line.split(": ")[1] ?? "";
      return value.trim().length > 0;
    })
    .join("\n\n");

  return `
You are a marketing analyst for food and fast-casual restaurant brands.

Analyze the following competitor web page content and return a JSON object.

Return valid JSON only with these exact keys:
- hook_type: the style of the main headline (e.g. "curiosity", "offer", "identity", "urgency", "social proof", "lifestyle")
- tone: the brand voice (e.g. "playful", "premium", "bold", "warm", "minimal", "hype")
- cta_type: the type of call to action (e.g. "order now", "visit us", "limited time", "explore menu", "none")
- topic: the primary content topic (e.g. "new menu item", "promo", "brand story", "seasonal", "value", "experience")
- offer_type: the type of offer if present (e.g. "discount", "limited time", "bundle", "free item", "none")
- urgency: urgency level (e.g. "high", "medium", "low", "none")
- visual_style: likely visual style based on copy tone (e.g. "bright food photography", "dark premium", "lifestyle", "minimal", "bold graphics")
- ai_summary: 1-2 sentence summary of what this brand is communicating and why it works or doesn't
- score: integer 1-10 rating the strength of the marketing based on clarity, hook quality, and CTA strength

Rules:
- Return JSON only. No markdown. No explanation.
- "score" must be an integer 1 to 10.
- If a field is unclear, make your best inference from the available content.
- Focus on marketing intent, not just literal description.

Page content:
${sections}
`.trim();
}

export async function GET() {
  const { data: posts, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!posts || posts.length === 0) {
    return NextResponse.json({ error: "No posts found to analyze" }, { status: 404 });
  }

  const results = [];

  for (const post of posts) {
    const { data: existingAnalysis } = await supabase
      .from("analysis")
      .select("id")
      .eq("post_id", post.id)
      .limit(1);

    if (existingAnalysis && existingAnalysis.length > 0) {
      results.push({ postId: post.id, skipped: true, reason: "Already analyzed" });
      continue;
    }

    try {
      const prompt = buildPrompt(post);

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
      });

      const text = (completion.choices[0].message.content ?? "").trim();

      const cleaned = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();

      const parsed = JSON.parse(cleaned);

      const { data: savedAnalysis, error: insertError } = await supabase
        .from("analysis")
        .insert([
          {
            post_id: post.id,
            hook_type: parsed.hook_type,
            tone: parsed.tone,
            cta_type: parsed.cta_type,
            topic: parsed.topic,
            offer_type: parsed.offer_type,
            urgency: parsed.urgency,
            visual_style: parsed.visual_style,
            ai_summary: parsed.ai_summary,
            score: parsed.score,
          },
        ])
        .select()
        .single();

      if (insertError) {
        results.push({ postId: post.id, error: insertError.message });
      } else {
        results.push({ postId: post.id, success: true, analysis: savedAnalysis });
      }
    } catch (err) {
      results.push({
        postId: post.id,
        error: err instanceof Error ? err.message : "Analysis failed",
      });
    }
  }

  return NextResponse.json({
    success: true,
    processed: results.length,
    results,
  });
}
