import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { canManageAgenticaLibrary, getCurrentTeamRole } from "@/lib/team-role";
import { openai } from "@/lib/openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";

// Point fluent-ffmpeg at the static binary
if (ffmpegStatic) ffmpeg.setFfmpegPath(ffmpegStatic);

export const maxDuration = 60;

// ─── Frame extraction ────────────────────────────────────────────────────────

async function downloadVideo(url: string): Promise<{ path: string; buffer: Buffer }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download video: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const path = join(tmpdir(), `agentica-ref-${randomUUID()}.mp4`);
  await writeFile(path, buffer);
  return { path, buffer };
}

async function extractFrames(videoPath: string, count = 5): Promise<string[]> {
  const dir = join(tmpdir(), `agentica-frames-${randomUUID()}`);
  await mkdir(dir, { recursive: true });

  await new Promise<void>((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions([
        `-vf fps=1/${Math.ceil(5 / count)},scale=1280:-1`,
        `-frames:v ${count}`,
      ])
      .output(join(dir, "frame-%02d.jpg"))
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .run();
  });

  const frames: string[] = [];
  for (let i = 1; i <= count; i++) {
    const framePath = join(dir, `frame-${String(i).padStart(2, "0")}.jpg`);
    try {
      const data = await readFile(framePath);
      frames.push(data.toString("base64"));
    } catch {
      // frame may not exist if clip is shorter than expected
    }
  }

  return frames;
}

async function cleanupFiles(paths: string[]) {
  await Promise.allSettled(paths.map((p) => unlink(p).catch(() => {})));
}

// ─── Gemini video analysis ───────────────────────────────────────────────────

async function analyzeWithGemini(videoBuffer: Buffer): Promise<GeminiAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });

  const videoBase64 = videoBuffer.toString("base64");

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: "video/mp4",
        data: videoBase64,
      },
    },
    {
      text: `You are a professional video editor analyzing a reference video for an AI ad generation system.

Analyze this video and return ONLY valid JSON in exactly this shape — no markdown, no extra text:
{
  "camera_movement": "description of how the camera moves (e.g. slow push-in, static, pan left, handheld)",
  "pacing": "slow | medium | fast",
  "cut_rhythm": "description of cuts (e.g. single continuous shot, cuts every 2s, rapid cuts)",
  "motion_speed": "slow | medium | fast",
  "transition_style": "description of transitions (e.g. hard cut, fade, dissolve, none)",
  "shot_type": "close up | wide | overhead | POV | tracking | slow zoom | medium shot",
  "motion": "precise description of the main motion element"
}`,
    },
  ]);

  const text = result.response.text().trim();
  const clean = text.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
  return JSON.parse(clean) as GeminiAnalysis;
}

// ─── GPT-4o frame analysis ───────────────────────────────────────────────────

async function analyzeWithGPT(frames: string[]): Promise<GPTAnalysis> {
  if (frames.length === 0) throw new Error("No frames to analyze");

  const imageContent = frames.map((b64) => ({
    type: "image_url" as const,
    image_url: { url: `data:image/jpeg;base64,${b64}`, detail: "high" as const },
  }));

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          ...imageContent,
          {
            type: "text",
            text: `You are a senior creative director and AI video specialist analyzing reference video frames for an ad generation system. Your job is to fully describe this video so the system can recreate its style for any brand's product — with zero manual input from the admin.

Analyze these frames and return ONLY valid JSON in exactly this shape — no markdown, no extra text:
{
  "visual_style": "precise style description (e.g. cinematic dark warm tones, clean minimal white, high contrast moody)",
  "lighting": "golden hour | studio | daylight | backlit | soft diffused | neon | mixed",
  "lighting_description": "precise description of the lighting character and quality",
  "mood": "energetic | calm | urgent | playful | premium | authentic | aspirational",
  "color_palette": ["#hex1", "#hex2", "#hex3"],
  "grain": "none | subtle film grain | heavy grain | 35mm film | digital clean",
  "composition": "description of how subjects are framed and positioned",
  "texture": "description of surface textures and material feel",
  "full_prompt": "a single detailed generation prompt that would recreate this exact visual style for any product, 2-3 sentences, written for an AI video engine",
  "suggested_title": "a short descriptive title for this style (e.g. 'Warm Cinematic Product Hero', 'High Energy Street Style')",
  "style_category": "one of exactly: cinematic | lifestyle | product | energetic | text-forward",
  "recommended_engine": "one of exactly: higgsfield | kling | pika — higgsfield for human lifestyle scenes, kling for environmental/landscape/product, pika for still product animation",
  "engine_reasoning": "one sentence explaining why this engine fits this style",
  "example_hooks": ["hook line 1 that fits this style", "hook line 2", "hook line 3"],
  "example_ctas": ["CTA 1 that fits this style", "CTA 2", "CTA 3"],
  "brand_fit": "description of what type of brand or product this style works best for",
  "quality_score": 8,
  "quality_notes": "brief notes on what makes this a good or weak reference — lighting consistency, motion quality, usability as a style anchor"
}`,
          },
        ],
      },
    ],
    max_tokens: 800,
  });

  const text = response.choices[0].message.content?.trim() ?? "{}";
  const clean = text.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
  return JSON.parse(clean) as GPTAnalysis;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface GeminiAnalysis {
  camera_movement: string;
  pacing: string;
  cut_rhythm: string;
  motion_speed: string;
  transition_style: string;
  shot_type: string;
  motion: string;
}

interface GPTAnalysis {
  visual_style: string;
  lighting: string;
  lighting_description: string;
  mood: string;
  color_palette: string[];
  grain: string;
  composition: string;
  texture: string;
  full_prompt: string;
  // Auto-classification
  suggested_title: string;
  style_category: "cinematic" | "lifestyle" | "product" | "energetic" | "text-forward";
  recommended_engine: "higgsfield" | "kling" | "pika";
  engine_reasoning: string;
  // Hook/CTA extraction
  example_hooks: string[];
  example_ctas: string[];
  brand_fit: string;
  quality_score: number; // 1-10 — how good is this as a reference?
  quality_notes: string;
}

function mergeAnalysis(gemini: GeminiAnalysis, gpt: GPTAnalysis) {
  return {
    // Motion analysis (Gemini)
    shot_type:            gemini.shot_type,
    motion:               gemini.motion,
    camera_movement:      gemini.camera_movement,
    pacing:               gemini.pacing,
    cut_rhythm:           gemini.cut_rhythm,
    motion_speed:         gemini.motion_speed,
    transition_style:     gemini.transition_style,
    // Visual analysis (GPT)
    visual_style:         gpt.visual_style,
    lighting:             gpt.lighting,
    lighting_description: gpt.lighting_description,
    mood:                 gpt.mood,
    color_palette:        gpt.color_palette,
    grain:                gpt.grain,
    composition:          gpt.composition,
    texture:              gpt.texture,
    full_prompt:          gpt.full_prompt,
    // Auto-classification
    suggested_title:      gpt.suggested_title,
    style_category:       gpt.style_category,
    recommended_engine:   gpt.recommended_engine,
    engine_reasoning:     gpt.engine_reasoning,
    // Ad generation helpers
    example_hooks:        gpt.example_hooks,
    example_ctas:         gpt.example_ctas,
    brand_fit:            gpt.brand_fit,
    // Self-judging
    quality_score:        gpt.quality_score,
    quality_notes:        gpt.quality_notes,
  };
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const admin    = createSupabaseAdmin();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getCurrentTeamRole(supabase, user);
  if (!canManageAgenticaLibrary(role)) {
    return NextResponse.json({ error: "Only admins can run reference analysis." }, { status: 403 });
  }

  const { reference_id } = await req.json();
  if (!reference_id) {
    return NextResponse.json({ error: "reference_id is required" }, { status: 400 });
  }

  // Fetch the reference
  const { data: ref, error: refErr } = await supabase
    .from("reference_library")
    .select("id, video_url, title")
    .eq("id", reference_id)
    .single();

  if (refErr || !ref) {
    return NextResponse.json({ error: "Reference not found" }, { status: 404 });
  }

  if (!ref.video_url) {
    return NextResponse.json({ error: "Reference has no video_url" }, { status: 400 });
  }

  const tmpFiles: string[] = [];

  try {
    // 1. Download video
    const { path: videoPath, buffer: videoBuffer } = await downloadVideo(ref.video_url);
    tmpFiles.push(videoPath);

    // 2. Extract frames + run Gemini in parallel
    const [frames, geminiResult] = await Promise.all([
      extractFrames(videoPath, 5),
      analyzeWithGemini(videoBuffer),
    ]);

    // 3. Run GPT-4o on frames
    const gptResult = await analyzeWithGPT(frames);

    // 4. Merge
    const promptJson = mergeAnalysis(geminiResult, gptResult);

    // 5. Upload all frames to storage — thumbnail + key frames for generation anchoring
    let thumbnailUrl: string | null = null;
    const keyFrameUrls: string[] = [];

    await Promise.all(
      frames.map(async (frameBase64, idx) => {
        const frameBuffer = Buffer.from(frameBase64, "base64");
        const framePath = idx === 0
          ? `reference-library/thumbnails/${reference_id}.jpg`
          : `reference-library/frames/${reference_id}-${idx}.jpg`;

        const { error: uploadErr } = await admin.storage
          .from("reference-library")
          .upload(framePath, frameBuffer, { contentType: "image/jpeg", upsert: true });

        if (!uploadErr) {
          const { data: urlData } = admin.storage
            .from("reference-library")
            .getPublicUrl(framePath);
          if (idx === 0) {
            thumbnailUrl = urlData.publicUrl;
          }
          keyFrameUrls[idx] = urlData.publicUrl;
        }
      })
    );

    // 6. Save back to DB — overwrite auto-classification fields
    const updatePayload: Record<string, unknown> = {
      prompt:         promptJson,
      style_category: promptJson.style_category ?? "lifestyle",
      engine:         promptJson.recommended_engine ?? "higgsfield",
      title:          promptJson.suggested_title,
      is_approved:    (promptJson.quality_score ?? 0) >= 6,
      key_frames:     keyFrameUrls.filter(Boolean),
    };
    if (thumbnailUrl) updatePayload.thumbnail_url = thumbnailUrl;

    const { data: updated, error: updateErr } = await admin
      .from("reference_library")
      .update(updatePayload)
      .eq("id", reference_id)
      .select("*")
      .single();

    if (updateErr) throw new Error(updateErr.message);

    return NextResponse.json({
      reference: updated,
      analysis: promptJson,
      auto_approved: updatePayload.is_approved,
      quality_score: promptJson.quality_score,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    console.error("[reference-library/analyze]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await cleanupFiles(tmpFiles);
  }
}
