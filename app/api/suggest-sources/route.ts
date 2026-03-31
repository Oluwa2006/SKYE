import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";

export async function POST(req: NextRequest) {
  const { description } = await req.json();

  if (!description?.trim()) {
    return NextResponse.json({ error: "Business description is required" }, { status: 400 });
  }

  const prompt = `
You are a competitive research assistant for food and restaurant brands.

A business owner has described their business below. Your job is to identify 6 real competitor brands they should be tracking — brands that are similar in niche, style, or target audience.

Business description:
"${description}"

Return a JSON object in this exact format:
{
  "competitors": [
    {
      "name": "Brand Name",
      "url": "https://www.example.com/menu",
      "niche": "short niche description (e.g. fast casual burgers)",
      "platform": "website",
      "reason": "one sentence explaining why this is a relevant competitor"
    }
  ]
}

Rules:
- Return JSON only. No markdown. No explanation outside the JSON.
- Return exactly 6 competitors.
- Use real brand names and real working URLs — prefer menu pages, homepage, or promo pages over social media.
- Prioritize brands that are publicly accessible (no login required).
- platform should always be "website".
- Match the niche, price point, and audience of the business described.
`.trim();

  try {
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

    if (!parsed.competitors || !Array.isArray(parsed.competitors)) {
      return NextResponse.json({ error: "No competitors returned" }, { status: 500 });
    }

    return NextResponse.json({ competitors: parsed.competitors });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Suggestion failed" },
      { status: 500 }
    );
  }
}
