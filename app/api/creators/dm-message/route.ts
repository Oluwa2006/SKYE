import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabase } from "@/lib/supabase";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const { creator } = await req.json();
  if (!creator?.handle) {
    return NextResponse.json({ error: "Creator handle required" }, { status: 400 });
  }

  // Pull brand context from settings
  const { data: rows } = await supabase.from("settings").select("key, value");
  const settings: Record<string, string> = {};
  for (const row of rows ?? []) settings[row.key] = row.value;

  const brandName    = settings["profile_brand"]?.trim() || "our brand";
  const brandContext = settings["business_description"]?.trim() || "";

  const niche    = (creator.niche_tags ?? []).slice(0, 3).join(", ") || "content creation";
  const followers = creator.followers ? `${creator.followers.toLocaleString()} followers` : "";
  const bio       = creator.bio ? `Bio: "${creator.bio}"` : "";

  const prompt = `You are writing a casual, warm Instagram DM outreach message from a brand to a creator.

Brand: ${brandName}
${brandContext ? `About the brand: ${brandContext}` : ""}

Creator: @${creator.handle}
${followers ? `Followers: ${followers}` : ""}
Niche/tags: ${niche}
${bio}

Write a short, friendly DM (3–4 short paragraphs max). Rules:
- Sound like a real person, not a marketing bot
- Open with genuine interest in their content specifically
- Mention you're interested in a paid collab, keep it casual
- End with a soft open question, no pressure
- No emojis overload — 1 or 2 max, natural placement
- Do NOT mention follower counts, tiers, or metrics
- Do NOT use corporate language like "partnership opportunity" or "synergy"
- Keep it under 120 words

Return only the message text, no subject line, no quotes around it.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.85,
      max_tokens: 200,
    });

    const message = response.choices[0]?.message?.content?.trim() ?? "";
    return NextResponse.json({ message });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
