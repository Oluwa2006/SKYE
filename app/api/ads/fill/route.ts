import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { supabase } from "@/lib/supabase";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const { templateId, ideaContext } = await req.json();

  const { data: rows } = await supabase.from("settings").select("key, value");
  const s: Record<string, string> = {};
  for (const row of rows ?? []) s[row.key] = row.value;

  const brandName    = s["profile_brand"]  || s["brand_name"] || "Your Brand";
  const brandContext = s["business_description"] || "";
  const brandVoice   = s["brand_voice"] || "friendly and confident";

  const FIELD_SPECS: Record<string, string> = {
    ProductSpotlight: `headline (max 5 words, punchy), subtext (max 10 words, benefit-driven), cta (max 3 words, action verb)`,
    LimitedOffer:     `offerText (e.g. "50% OFF" or "Buy 2 Get 1" — max 4 words), subtext (urgency, max 8 words), cta (max 3 words), urgencyLabel (e.g. "Today only" — max 3 words)`,
    SocialProof:      `quote (realistic customer review, 15-25 words, first person, enthusiastic but believable), customerName (realistic first name + last initial)`,
    ReelOpener:       `tagline (3-4 words, brand positioning — e.g. "Made with love" or "Always fresh")`,
    StatsDrop:        `headline (max 8 words, credibility-building), stat1val, stat1label, stat2val, stat2label, stat3val, stat3label, stat4val, stat4label (each max 3 words)`,
    StoryCTA:         `headline (max 6 words, emotionally resonant), subtext (max 12 words, soft sell), cta (max 4 words, inviting)`,
    BeforeAfter:      `beforeText (max 4 words, the problem/old way), afterText (max 4 words, the solution/new way), beforeLabel ("Before"), afterLabel ("After")`,
    UGCFrame:         `creatorHandle (fictional realistic instagram handle, no @), caption (realistic excited creator caption, 15-20 words, include 1-2 emojis)`,
  };

  const fieldSpec = FIELD_SPECS[templateId];
  if (!fieldSpec) return NextResponse.json({ error: "Unknown template" }, { status: 400 });

  const prompt = `You are a top-tier ad copywriter. Generate ad copy fields for a ${templateId} video ad.

Brand: ${brandName}
${brandContext ? `About: ${brandContext}` : ""}
Brand voice: ${brandVoice}
${ideaContext ? `Content idea: ${ideaContext}` : ""}

Generate ONLY these fields as a flat JSON object (no nesting, no markdown):
${fieldSpec}

Rules:
- Write like a human copywriter, not a robot
- Be specific to the brand, not generic
- Make it feel native to Instagram/TikTok — punchy, real, scroll-stopping
- Return ONLY valid JSON, nothing else`;

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.85,
      response_format: { type: "json_object" },
    });
    const fields = JSON.parse(res.choices[0].message.content ?? "{}");
    return NextResponse.json({ fields });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "AI failed" }, { status: 500 });
  }
}
