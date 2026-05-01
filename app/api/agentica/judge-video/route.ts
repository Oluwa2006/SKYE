import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 60;

// ─── Judge: analyze generated video with Gemini ───────────────────────────────
//
// Gemini 2.0 Flash can watch the full MP4 and score it on production quality,
// style match, and brand fit — far more accurate than GPT-4o on a static frame.

interface JudgeResult {
  visual_match: number;    // 1-10
  style_adherence: number; // 1-10
  brand_fit: number;       // 1-10
  overall: number;         // 1-10
  pass: boolean;           // overall >= 6
  notes: string;
  suggestions: string[];
}

async function downloadVideo(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download video for judging: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function judgeVideoWithGemini(
  videoBuffer: Buffer,
  referencePrompt: Record<string, unknown>,
  variantHook: string,
): Promise<JudgeResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });

  const styleDescription = [
    referencePrompt.visual_style,
    referencePrompt.lighting_description,
    referencePrompt.mood,
    referencePrompt.full_prompt,
  ].filter(Boolean).join(". ");

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: "video/mp4",
        data: videoBuffer.toString("base64"),
      },
    },
    {
      text: `You are a senior creative director and performance marketer judging an AI-generated ad video for production readiness.

Reference style target:
"${styleDescription}"

Ad hook: "${variantHook}"

Watch this video fully and return ONLY valid JSON — no markdown, no explanation:
{
  "visual_match": 7,
  "style_adherence": 8,
  "brand_fit": 7,
  "overall": 7,
  "pass": true,
  "notes": "1-2 sentence honest assessment of production quality and ad readiness",
  "suggestions": ["actionable fix 1 — specific and concrete", "actionable fix 2"]
}

Scoring criteria:
- visual_match (1-10): lighting quality, color accuracy, composition vs reference style — judge from actual video motion and frames
- style_adherence (1-10): does the pacing, camera movement, and mood match the target aesthetic (cinematic/lifestyle/product/energetic)?
- brand_fit (1-10): would this pass as a real professional ad — no amateur artifacts, distortion, watermarks, or jerky motion
- overall (1-10): weighted average (visual_match×0.35 + style_adherence×0.35 + brand_fit×0.3)
- pass: true only if overall >= 6 AND no major visual or motion artifacts present
- suggestions: concrete, actionable next steps (e.g. "Increase motion blur to match reference pacing", "Resubmit with warmer color grade")`,
    },
  ]);

  const text = result.response.text().trim();
  const clean = text.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
  return JSON.parse(clean) as JudgeResult;
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { variant_id, video_url, reference_id } = body;

  if (!variant_id || !video_url) {
    return NextResponse.json({ error: "variant_id and video_url are required" }, { status: 400 });
  }

  // Fetch reference prompt for style comparison
  let referencePrompt: Record<string, unknown> = {
    visual_style: "professional ad quality",
    mood: "aspirational",
    full_prompt: "clean, well-lit, professional video advertisement",
  };

  if (reference_id) {
    const { data: ref } = await supabase
      .from("reference_library")
      .select("prompt")
      .eq("id", reference_id)
      .single();
    if (ref?.prompt) referencePrompt = ref.prompt as Record<string, unknown>;
  }

  // Fetch variant hook for context
  const { data: variant } = await supabase
    .from("variant_outputs")
    .select("hook")
    .eq("id", variant_id)
    .single();

  const hook = variant?.hook ?? "";

  // Download the video and send to Gemini for real motion+quality analysis
  let judgeResult: JudgeResult;
  try {
    const videoBuffer = await downloadVideo(video_url);
    judgeResult = await judgeVideoWithGemini(videoBuffer, referencePrompt, hook);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Judge failed";
    console.error("[agentica/judge-video]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // Write score back to DB
  try {
    await supabase
      .from("variant_outputs")
      .update({
        quality_score:       judgeResult.overall,
        quality_pass:        judgeResult.pass,
        quality_notes:       judgeResult.notes,
        quality_suggestions: judgeResult.suggestions,
      })
      .eq("id", variant_id);
  } catch {
    // Non-fatal — columns may not exist until migration applied
  }

  return NextResponse.json({ judge: judgeResult });
}
