import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { openai } from "@/lib/openai";

function buildIdeasPrompt(analyses: any[]): string {
  const sorted = [...analyses].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const patternSummary = sorted
    .map((a, i) => {
      const parts = [
        `#${i + 1} (score ${a.score ?? "?"}):`,
        a.hook_type && `Hook style: ${a.hook_type}`,
        a.tone && `Tone: ${a.tone}`,
        a.topic && `Topic: ${a.topic}`,
        a.cta_type && `CTA: ${a.cta_type}`,
        a.offer_type && a.offer_type !== "none" && `Offer: ${a.offer_type}`,
        a.urgency && a.urgency !== "none" && `Urgency: ${a.urgency}`,
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

  return `
You are a content strategist for a food and fast-casual restaurant brand competing with brands like Shake Shack, Sweetgreen, CAVA, Panera, and Chipotle.

Below are recent analyses of competitor marketing content, ranked by score. Use these patterns to generate 10 original Instagram content ideas for our brand.

---
COMPETITOR PATTERN SUMMARY:

Top tones used: ${topTones}
Top hook styles: ${topHooks}
Topics covered: ${topTopics}

Detailed breakdown:
${patternSummary}

---
TASK:

Generate exactly 10 Instagram content ideas inspired by what is working for competitors, but original to our brand.

Return valid JSON only in this exact format:
{
  "ideas": [
    {
      "title": "short internal name for this idea",
      "angle": "the strategic angle or hook approach (e.g. 'urgency + limited item', 'identity-based', 'behind the scenes')",
      "caption": "ready-to-post Instagram caption, 2-4 sentences, conversational and on-brand",
      "script": "optional 15-30 second video script or visual description if this works as a reel or story",
      "cta": "the specific call to action (e.g. 'Order now — link in bio', 'Tag a friend who needs this')"
    }
  ]
}

Rules:
- Return JSON only. No markdown. No explanation.
- Exactly 10 ideas.
- Vary the ideas: mix promos, cravings, behind-the-scenes, community, menu spotlights, urgency plays, and lifestyle angles.
- Captions should feel human, not corporate.
- Borrow the best-performing patterns from the competitor analysis above.
- Make ideas specific — avoid vague phrases like "show your food" or "share your story".
`.trim();
}

export async function GET() {
  const { data: analyses, error } = await supabase
    .from("analysis")
    .select("*")
    .order("score", { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!analyses || analyses.length === 0) {
    return NextResponse.json(
      { error: "No analysis found to generate ideas from" },
      { status: 404 }
    );
  }

  try {
    const prompt = buildIdeasPrompt(analyses);

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

    if (!parsed.ideas || !Array.isArray(parsed.ideas)) {
      return NextResponse.json(
        { error: "Model response did not include a valid ideas array" },
        { status: 500 }
      );
    }

    const today = new Date().toISOString().split("T")[0];

    await supabase.from("ideas").delete().eq("date_generated", today);

    const rowsToInsert = parsed.ideas.map((idea: any) => ({
      date_generated: today,
      niche: "fast food",
      title: idea.title,
      angle: idea.angle,
      caption: idea.caption,
      script: idea.script,
      cta: idea.cta,
      status: "draft",
    }));

    const { data: savedIdeas, error: insertError } = await supabase
      .from("ideas")
      .insert(rowsToInsert)
      .select();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      date: today,
      ideasGenerated: savedIdeas.length,
      ideas: savedIdeas,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Idea generation failed" },
      { status: 500 }
    );
  }
}
