import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabase } from "@/lib/supabase";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  // Optional override filters from the client (niche, location, followerTier)
  const body = await req.json().catch(() => ({}));
  const { niche, location, followerTier } = body as Record<string, string>;

  // Pull brand context from settings — same source used by Ideas & Sources
  const { data: rows } = await supabase.from("settings").select("key, value");
  const settings: Record<string, string> = {};
  for (const row of rows ?? []) settings[row.key] = row.value;

  const businessDescription = settings["business_description"]?.trim();
  const brandName           = settings["profile_brand"]?.trim();

  if (!businessDescription && !brandName) {
    return NextResponse.json(
      { error: "No brand context found. Please fill in your Brand Prompt first (Settings → Brand Prompt)." },
      { status: 400 }
    );
  }

  const brandContext = [
    businessDescription ?? `Brand: ${brandName}`,
    niche        ? `Preferred niche: ${niche}`              : null,
    location     ? `Location focus: ${location}`            : null,
    followerTier ? `Follower tier: ${followerTier}`         : null,
  ].filter(Boolean).join("\n");

  try {
    const chat = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a UGC and influencer marketing expert. Based on the brand context provided, suggest real, active Instagram creators who would be a strong fit for a UGC partnership. Only suggest creators who genuinely exist and post regularly. Return a JSON object with a single key "handles" containing an array of 6 Instagram usernames (strings, no @ symbol). Example: {"handles":["user1","user2","user3","user4","user5","user6"]}`,
        },
        {
          role: "user",
          content: `Find 6 real Instagram UGC creators who would be a great fit for this brand:\n\n${brandContext}`,
        },
      ],
    });

    const raw    = chat.choices[0].message.content ?? "{}";
    const parsed = JSON.parse(raw);
    const arr: unknown[] = parsed.handles ?? parsed.usernames ?? parsed.creators ?? [];

    const handles: string[] = arr
      .map((h: unknown) => (typeof h === "string" ? h.replace(/^@/, "").trim() : ""))
      .filter(Boolean)
      .slice(0, 8);

    if (!handles.length) {
      return NextResponse.json({ error: "AI returned no suggestions." }, { status: 500 });
    }

    return NextResponse.json({ handles, brandName: brandName || "your brand" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI suggestion failed" },
      { status: 500 }
    );
  }
}
