import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const maxDuration = 30;

// ─── Ad copy adapter ──────────────────────────────────────────────────────────
// Takes the text layers from a reference ad schema and rewrites every line
// to fit the user's business — keeping the exact structure, tone, pacing,
// and character constraints of the original.

interface TextLayerInput {
  id:           string;
  role:         string;  // hook | subtext | cta | brand | label | other
  content:      string;
  max_chars?:   number;  // derived from original content length × 1.2
}

interface AdaptedLayer {
  id:       string;
  role:     string;
  original: string;
  adapted:  string;
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    text_layers,        // TextLayerInput[]
    brand_context,      // user's brand prompt / business description
    reference_description, // what the reference ad is about (e.g. "Apple MacBook Pro ad")
    tone,               // optional tone override
  } = body as {
    text_layers:           TextLayerInput[];
    brand_context:         string;
    reference_description?: string;
    tone?:                 string;
  };

  if (!text_layers?.length) {
    return NextResponse.json({ error: "text_layers is required" }, { status: 400 });
  }
  if (!brand_context?.trim()) {
    return NextResponse.json({ error: "brand_context is required — set your Brand Prompt in Settings" }, { status: 400 });
  }

  // Build a structured list of layers for GPT to rewrite
  const layerList = text_layers
    .filter(l => l.content?.trim())
    .map(l => ({
      id:        l.id,
      role:      l.role,
      original:  l.content,
      max_chars: Math.ceil(l.content.length * 1.2), // 20% breathing room
    }));

  if (!layerList.length) {
    return NextResponse.json({ error: "No text content found in schema to adapt" }, { status: 400 });
  }

  const prompt = `You are an expert direct-response copywriter specialising in video ad scripts.

TASK: Rewrite the text layers from a reference ad to fit a completely different business.
Keep the EXACT same structure, emotional arc, pacing, and tone as the original.
Change ONLY the words — not the role each line plays in the ad.

REFERENCE AD: ${reference_description ?? "Unknown product ad"}

TARGET BUSINESS:
${brand_context}

TONE: ${tone ?? "Match the energy and style of the reference ad exactly"}

TEXT LAYERS TO REWRITE (each has a role and a max character limit — stay within it):
${layerList.map((l, i) =>
  `${i + 1}. [${l.role.toUpperCase()}] "${l.original}" (max ${l.max_chars} chars)`
).join("\n")}

RULES:
- The hook must create the same emotional punch as the original but for this business
- Keep CTA lines short and action-oriented (match original length closely)
- Brand lines should reflect the target business name or tagline
- Do NOT add explanations — output ONLY valid JSON
- Preserve capitalization style (if original is UPPERCASE, keep it uppercase)
- If the original uses punctuation for style (em dash, ellipsis), mirror it

Return ONLY this JSON (no markdown, no explanation):
{
  "adapted": [
    { "id": "<layer_id>", "role": "<role>", "original": "<original text>", "adapted": "<new text>" }
  ],
  "adaptation_notes": "<1 sentence describing the creative approach taken>"
}`;

  try {
    const response = await openai.chat.completions.create({
      model:       "gpt-4o",
      messages:    [{ role: "user", content: prompt }],
      temperature: 0.75,
      max_tokens:  1200,
    });

    const raw   = response.choices[0].message.content?.trim() ?? "";
    const clean = raw.replace(/^```json\s*/i, "").replace(/\n?```$/i, "").trim();

    let parsed: { adapted: AdaptedLayer[]; adaptation_notes?: string };
    try {
      parsed = JSON.parse(clean);
    } catch {
      return NextResponse.json({ error: "GPT returned non-JSON output", raw }, { status: 500 });
    }

    return NextResponse.json({
      adapted:           parsed.adapted ?? [],
      adaptation_notes:  parsed.adaptation_notes ?? "",
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Adaptation failed";
    console.error("[adapt-copy]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
