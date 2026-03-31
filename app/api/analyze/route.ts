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
      const value = line.split(": ").slice(1).join(": ");
      return value.trim().length > 0;
    })
    .join("\n\n");

  return `
You are a senior marketing analyst specializing in food and fast-casual restaurant brands.

Analyze the following competitor web page content and return a structured JSON object.

Return valid JSON only with these exact keys:

- hook_type: style of the main hook (e.g. "curiosity", "offer", "identity", "urgency", "social proof", "lifestyle", "exclusivity")
- tone: brand voice tone (e.g. "playful", "premium", "bold", "warm", "minimal", "hype", "community")
- cta_type: type of call to action (e.g. "order now", "visit us", "limited time", "explore menu", "download app", "none")
- topic: primary content topic (e.g. "new menu item", "promo", "brand story", "seasonal", "value", "experience", "team")
- offer_type: type of offer if present (e.g. "discount", "limited time", "bundle", "free item", "loyalty", "none")
- urgency: urgency level ("high", "medium", "low", "none")
- visual_style: inferred visual style based on copy tone (e.g. "bright food photography", "dark premium", "lifestyle", "minimal text", "bold graphics", "UGC style")
- ai_summary: 2-3 sentences explaining what this brand is communicating, why it likely works, and what tactic it represents
- score: integer 1–10 rating marketing strength based on hook clarity, offer value, CTA strength, and overall persuasion
- confidence_score: integer 1–10 rating your confidence in this analysis based on how much usable content was available (10 = rich content, 1 = almost no signal)

Rules:
- Return JSON only. No markdown. No explanation.
- score and confidence_score must be integers 1–10.
- If content is sparse, set confidence_score low and still make your best inference.
- Focus on marketing intent and persuasion mechanics, not literal description.

Page content:
${sections}
`.trim();
}

export async function GET() {
  const { data: posts, error } = await supabase
    .from("posts")
    .select("*")
    .order("traction_score", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!posts || posts.length === 0) {
    return NextResponse.json({ error: "No posts found to analyze" }, { status: 404 });
  }

  const results = [];

  for (const post of posts) {
    // Skip already-analyzed posts
    const { data: existing } = await supabase
      .from("analysis")
      .select("id")
      .eq("post_id", post.id)
      .limit(1);

    if (existing && existing.length > 0) {
      results.push({ postId: post.id, status: "skipped", reason: "Already analyzed" });
      continue;
    }

    try {
      const prompt = buildPrompt(post);

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      });

      const text = (completion.choices[0].message.content ?? "").trim();
      const cleaned = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();

      const parsed = JSON.parse(cleaned);

      const { error: insertError } = await supabase
        .from("analysis")
        .insert([{
          post_id: post.id,
          hook_type: parsed.hook_type ?? null,
          tone: parsed.tone ?? null,
          cta_type: parsed.cta_type ?? null,
          topic: parsed.topic ?? null,
          offer_type: parsed.offer_type ?? null,
          urgency: parsed.urgency ?? null,
          visual_style: parsed.visual_style ?? null,
          ai_summary: parsed.ai_summary ?? null,
          score: parsed.score ?? null,
          confidence_score: parsed.confidence_score ?? null,
        }])
        .select()
        .single();

      if (insertError) {
        results.push({ postId: post.id, status: "error", reason: insertError.message });
      } else {
        results.push({ postId: post.id, status: "analyzed", score: parsed.score, confidence: parsed.confidence_score });
      }
    } catch (err) {
      results.push({
        postId: post.id,
        status: "error",
        reason: err instanceof Error ? err.message : "Analysis failed",
      });
    }
  }

  return NextResponse.json({ success: true, processed: results.length, results });
}
