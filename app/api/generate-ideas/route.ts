import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { openai } from "@/lib/openai";

const CONTENT_PILLARS = [
  "promo",
  "menu spotlight",
  "behind the scenes",
  "community",
  "limited-time offer",
  "seasonal",
  "engagement challenge",
  "UGC",
  "brand story",
  "value",
];

function buildIdeasPrompt(analyses: any[], businessDescription?: string): string {
  const sorted = [...analyses].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const patternSummary = sorted
    .map((a, i) => {
      const parts = [
        `#${i + 1} (score ${a.score ?? "?"}, confidence ${a.confidence_score ?? "?"})`,
        a.hook_type && `Hook: ${a.hook_type}`,
        a.tone && `Tone: ${a.tone}`,
        a.topic && `Topic: ${a.topic}`,
        a.cta_type && `CTA: ${a.cta_type}`,
        a.offer_type && a.offer_type !== "none" && `Offer: ${a.offer_type}`,
        a.urgency && a.urgency !== "none" && `Urgency: ${a.urgency}`,
        a.visual_style && `Visual style: ${a.visual_style}`,
        a.ai_summary && `Insight: ${a.ai_summary}`,
      ]
        .filter(Boolean)
        .join("\n  ");
      return parts;
    })
    .join("\n\n");

  const topTones = [...new Set(sorted.slice(0, 5).map((a) => a.tone).filter(Boolean))].join(", ");
  const topHooks = [...new Set(sorted.slice(0, 5).map((a) => a.hook_type).filter(Boolean))].join(", ");
  const topTopics = [...new Set(sorted.map((a) => a.topic).filter(Boolean))].join(", ");
  const topVisuals = [...new Set(sorted.slice(0, 5).map((a) => a.visual_style).filter(Boolean))].join(", ");

  const businessContext = businessDescription
    ? `OUR BUSINESS:\n${businessDescription}\n\n---\n`
    : "";

  return `
You are a senior content strategist for a food and fast-casual restaurant brand.

${businessContext}
Below are recent analyses of competitor marketing content, ranked by score. Use these patterns to generate 10 original content ideas for our brand.

---
COMPETITOR PATTERN SUMMARY:

Top tones: ${topTones}
Top hook styles: ${topHooks}
Top topics: ${topTopics}
Top visual styles: ${topVisuals}

Detailed breakdown:
${patternSummary}

---
TASK:

Generate exactly 10 content ideas. Each idea must belong to one of these content pillars:
${CONTENT_PILLARS.join(", ")}

Spread ideas across at least 6 different pillars.

Return valid JSON only in this exact format:
{
  "ideas": [
    {
      "title": "short internal name for this idea",
      "angle": "the strategic angle or hook approach",
      "content_pillar": "one of the pillars listed above",
      "caption": "ready-to-post caption, 2–4 sentences, conversational and on-brand",
      "script": "spoken voiceover — exact words read aloud over video, 10–20 seconds when spoken, natural speech only, no stage directions",
      "cta": "the specific call to action",
      "priority_score": "integer 1–10 estimating potential impact based on competitor patterns (10 = highest priority)"
    }
  ]
}

Rules:
- Return JSON only. No markdown. No explanation.
- Exactly 10 ideas.
- priority_score must be an integer 1–10.
- content_pillar must exactly match one of the pillars listed above.
- Scripts must be pure spoken words — no brackets, no visual directions, no (pause).
- Make ideas specific and actionable. No vague advice like "show your food".
- Borrow the best-performing patterns from competitor analysis but make them original.
`.trim();
}

export async function GET() {
  const { data: analyses, error } = await supabase
    .from("analysis")
    .select("*")
    .order("score", { ascending: false })
    .limit(15);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!analyses || analyses.length === 0) {
    return NextResponse.json({ error: "No analyses found to generate ideas from" }, { status: 404 });
  }

  // Fetch business description from settings
  const { data: settingsRows } = await supabase.from("settings").select("key, value");
  const settings: Record<string, string> = {};
  for (const row of settingsRows ?? []) settings[row.key] = row.value;
  const businessDescription = settings["business_description"];

  try {
    const prompt = buildIdeasPrompt(analyses, businessDescription);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const text = (completion.choices[0].message.content ?? "").trim();
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    if (!parsed.ideas || !Array.isArray(parsed.ideas)) {
      return NextResponse.json({ error: "Model did not return a valid ideas array" }, { status: 500 });
    }

    const today = new Date().toISOString().split("T")[0];

    // Replace today's ideas
    await supabase.from("ideas").delete().eq("date_generated", today);

    const rowsToInsert = parsed.ideas.map((idea: any) => ({
      date_generated: today,
      niche: "fast food",
      title: idea.title,
      angle: idea.angle,
      content_pillar: idea.content_pillar ?? null,
      caption: idea.caption,
      script: idea.script,
      cta: idea.cta,
      priority_score: typeof idea.priority_score === "number" ? idea.priority_score : null,
      status: "draft",
      approved: false,
      published: false,
    }));

    const { data: savedIdeas, error: insertError } = await supabase
      .from("ideas")
      .insert(rowsToInsert)
      .select();

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    // Sort by priority_score descending for the response
    const sorted = [...savedIdeas].sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0));

    return NextResponse.json({
      success: true,
      date: today,
      ideasGenerated: sorted.length,
      ideas: sorted,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Idea generation failed" },
      { status: 500 }
    );
  }
}
