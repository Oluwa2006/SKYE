import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { company_name, website, description, audience, goals } = body;

  if (!description) {
    return NextResponse.json({ error: "description is required" }, { status: 400 });
  }

  const prompt = `You are a brand strategist and competitive intelligence analyst.

A new company has described themselves:
- Name: ${company_name || "Unknown"}
- Website: ${website || "Not provided"}
- What they do: ${description}
- Target audience: ${audience || "Not specified"}
- Goals: ${goals || "Not specified"}

Your job: identify the competitive landscape they're entering.

Return ONLY valid JSON — no markdown, no explanation:
{
  "category": "<1-3 word category e.g. 'AI productivity', 'food delivery', 'DTC skincare'>",
  "positioning": "<1 sentence describing where this brand sits in the market>",
  "competitors": [
    {
      "name": "<Brand name>",
      "type": "<'direct' | 'aspirational' | 'creator' | 'aesthetic'>",
      "why": "<Why they compete for the same attention — be specific, 1 sentence>",
      "content_style": "<How they win on social — e.g. 'fast-cut UGC, bold claims', 'cinematic lifestyle', 'meme-heavy Gen Z'>",
      "threat_level": "<'high' | 'medium' | 'low'>"
    }
  ],
  "content_opportunities": [
    "<Gap or opportunity the competitors are missing — 1 sentence each>"
  ],
  "hook_themes": [
    "<A recurring emotional hook or narrative theme that wins in this category>"
  ]
}

Rules:
- Include 5-8 competitors across all types (direct, aspirational, creator-style, aesthetic)
- Be specific and accurate — real brand names only
- content_opportunities: 3-4 gaps or angles competitors are NOT doing well
- hook_themes: 3 themes that emotionally resonate in this market
- If the company is in a niche you know well, be precise. If unknown, extrapolate from the description.`;

  try {
    const response = await openai.chat.completions.create({
      model:       "gpt-4o",
      messages:    [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens:  1200,
    });

    const raw   = response.choices[0].message.content?.trim() ?? "";
    const clean = raw.replace(/^```json\s*/i, "").replace(/\n?```$/i, "").trim();

    const parsed = JSON.parse(clean);
    return NextResponse.json(parsed);

  } catch (err) {
    const message = err instanceof Error ? err.message : "Discovery failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
