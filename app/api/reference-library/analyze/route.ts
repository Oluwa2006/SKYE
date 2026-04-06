import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
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
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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
            text: `You are a creative director analyzing reference video frames for an AI ad generation system.

Analyze these frames and return ONLY valid JSON in exactly this shape — no markdown, no extra text:
{
  "visual_style": "precise style description (e.g. cinematic dark warm, clean minimal white, high contrast moody)",
  "lighting": "golden hour | studio | daylight | backlit | soft diffused | neon | mixed",
  "lighting_description": "precise description of the lighting character",
  "mood": "energetic | calm | urgent | playful | premium | authentic | aspirational",
  "color_palette": ["#hex1", "#hex2", "#hex3"],
  "grain": "none | subtle film grain | heavy grain | 35mm film | digital clean",
  "composition": "description of how subjects are framed",
  "texture": "description of surface textures visible",
  "full_prompt": "a single detailed generation prompt that would recreate this visual style, 2-3 sentences"
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
}

function mergeAnalysis(gemini: GeminiAnalysis, gpt: GPTAnalysis) {
  return {
    shot_type:           gemini.shot_type,
    visual_style:        gpt.visual_style,
    motion:              gemini.motion,
    lighting:            gpt.lighting,
    lighting_description: gpt.lighting_description,
    mood:                gpt.mood,
    color_palette:       gpt.color_palette,
    grain:               gpt.grain,
    composition:         gpt.composition,
    texture:             gpt.texture,
    camera_movement:     gemini.camera_movement,
    pacing:              gemini.pacing,
    cut_rhythm:          gemini.cut_rhythm,
    motion_speed:        gemini.motion_speed,
    transition_style:    gemini.transition_style,
    full_prompt:         gpt.full_prompt,
  };
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
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

    // 5. Use first frame as thumbnail if none exists
    let thumbnailUrl: string | null = null;
    if (frames[0]) {
      const thumbBuffer = Buffer.from(frames[0], "base64");
      const thumbPath = `reference-library/thumbnails/${reference_id}.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from("reference-library")
        .upload(thumbPath, thumbBuffer, { contentType: "image/jpeg", upsert: true });

      if (!uploadErr) {
        const { data: urlData } = supabase.storage
          .from("reference-library")
          .getPublicUrl(thumbPath);
        thumbnailUrl = urlData.publicUrl;
      }
    }

    // 6. Save back to DB
    const updatePayload: Record<string, unknown> = { prompt: promptJson };
    if (thumbnailUrl) updatePayload.thumbnail_url = thumbnailUrl;

    const { data: updated, error: updateErr } = await supabase
      .from("reference_library")
      .update(updatePayload)
      .eq("id", reference_id)
      .select("*")
      .single();

    if (updateErr) throw new Error(updateErr.message);

    return NextResponse.json({ reference: updated, analysis: promptJson });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    console.error("[reference-library/analyze]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await cleanupFiles(tmpFiles);
  }
}
