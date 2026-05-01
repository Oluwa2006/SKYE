import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { openai } from "@/lib/openai";
import { fal } from "@fal-ai/client";
import type {
  KlingVideoV2MasterImageToVideoInput,
  KlingVideoV2MasterTextToVideoInput,
  PikaV22ImageToVideoInput,
  PikaV22TextToVideoInput,
} from "@fal-ai/client/endpoints";
import { getPresetById } from "@/lib/style-presets";

fal.config({ credentials: process.env.FAL_KEY_API_KEY ?? "" });

export const maxDuration = 30;

const HIGGSFIELD_BASE = "https://platform.higgsfield.ai";

const NEGATIVE_PROMPT =
  "blur, distort, low quality, shaky cam, watermark, blurry faces, distorted hands, jerky motion, text overlay, subtitles";

// ─── Scene prompt builder ─────────────────────────────────────────────────────
// Combines the reference's visual style with the variant's ad content
// into a concrete video scene prompt the engine can act on.

interface ReferencePromptJson {
  shot_type?: string;
  motion?: string;
  camera_movement?: string;
  pacing?: string;
  visual_style?: string;
  lighting?: string;
  lighting_description?: string;
  mood?: string;
  color_palette?: string[];
  grain?: string;
  composition?: string;
  full_prompt?: string;
  transition_style?: string;
}

async function buildScenePrompt(args: {
  hook: string;
  script: string;
  cta: string;
  referencePromptJson: ReferencePromptJson | null;
  styleCategory: string;
  brandFit: string | null;
  hasProductImage: boolean;
}): Promise<string> {
  const { hook, script, cta, referencePromptJson, styleCategory, brandFit, hasProductImage } = args;

  // Build rich style context from the full structured reference JSON
  let styleContext: string;
  if (referencePromptJson) {
    const parts = [
      referencePromptJson.full_prompt && `Visual style: ${referencePromptJson.full_prompt}`,
      referencePromptJson.shot_type && `Shot type: ${referencePromptJson.shot_type}`,
      referencePromptJson.camera_movement && `Camera: ${referencePromptJson.camera_movement}`,
      referencePromptJson.lighting_description && `Lighting: ${referencePromptJson.lighting_description}`,
      referencePromptJson.mood && `Mood: ${referencePromptJson.mood}`,
      referencePromptJson.grain && referencePromptJson.grain !== "none" && `Texture: ${referencePromptJson.grain}`,
      referencePromptJson.pacing && `Pacing: ${referencePromptJson.pacing}`,
      referencePromptJson.color_palette?.length && `Color palette: ${referencePromptJson.color_palette.join(", ")}`,
    ].filter(Boolean).join(". ");
    styleContext = parts || `Style category: ${styleCategory}`;
  } else {
    styleContext = `Style category: ${styleCategory}`;
  }

  const brandLine = brandFit ? `Brand context: ${brandFit}` : "";
  const imageLine = hasProductImage
    ? "A product image is provided as the first frame anchor — describe how the product moves or is revealed, not what it looks like."
    : "";

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You write precise, cinematic video generation prompts for AI video engines. Return only the prompt — no explanation, no quotes, no markdown.",
      },
      {
        role: "user",
        content: `Write a single video scene prompt (max 2 sentences, under 70 words) for an ad with this content:

Hook: "${hook}"
Script: "${script}"
CTA: "${cta}"
${brandLine}

Style reference:
${styleContext}
${imageLine}

Rules:
- Describe the VISUAL SCENE only — camera movement, lighting, subject motion, atmosphere
- No text overlays, no narration, no subtitles in the scene description
- Match the reference style precisely — replicate the shot type, camera movement, and mood
- The scene should visually set up and support the hook message`,
      },
    ],
    max_tokens: 150,
    temperature: 0.35,
  });

  return response.choices[0].message.content?.trim() ?? hook;
}

// ─── Engine callers ───────────────────────────────────────────────────────────

async function generateHiggsfield(prompt: string, imageUrl: string | null): Promise<string> {
  const apiKey = process.env.HIGGSFIELD_API_KEY;
  if (!apiKey || apiKey === "your_higgsfield_key_here") {
    throw new Error("HIGGSFIELD_API_KEY not configured");
  }

  const body: Record<string, unknown> = {
    model: "dop-preview",
    prompt,
    negative_prompt: NEGATIVE_PROMPT,
    duration: 5,
    resolution: "1080p",
    enhance_prompt: true,
    check_nsfw: false,
    motion_strength: 0.8,
  };

  if (imageUrl) {
    body.input_images = [{ type: "image_url", image_url: imageUrl }];
  }

  const res = await fetch(`${HIGGSFIELD_BASE}/v1/image2video/dop`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Higgsfield error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const requestId = data.id ?? data.request_id ?? data.requestId;
  if (!requestId) throw new Error("Higgsfield returned no request ID");
  return `higgsfield::${requestId}`;
}

async function generateKling(prompt: string, imageUrl: string | null): Promise<string> {
  if (imageUrl) {
    const modelId = "fal-ai/kling-video/v2/master/image-to-video" as const;
    const input: KlingVideoV2MasterImageToVideoInput = {
      prompt,
      image_url: imageUrl,
      negative_prompt: NEGATIVE_PROMPT,
      duration: "5",
    };

    const { request_id } = await fal.queue.submit(modelId, { input });
    return `${modelId}::${request_id}`;
  }

  const modelId = "fal-ai/kling-video/v2/master/text-to-video" as const;
  const input: KlingVideoV2MasterTextToVideoInput = {
    prompt,
    negative_prompt: NEGATIVE_PROMPT,
    aspect_ratio: "9:16",
    duration: "5",
  };

  const { request_id } = await fal.queue.submit(modelId, { input });
  return `${modelId}::${request_id}`;
}

async function generatePika(prompt: string, imageUrl: string | null): Promise<string> {
  if (imageUrl) {
    const modelId = "fal-ai/pika/v2.2/image-to-video" as const;
    const input: PikaV22ImageToVideoInput = {
      image_url: imageUrl,
      prompt,
      negative_prompt: NEGATIVE_PROMPT,
      resolution: "1080p",
      duration: "5",
    };

    const { request_id } = await fal.queue.submit(modelId, { input });
    return `${modelId}::${request_id}`;
  }

  const modelId = "fal-ai/pika/v2.2/text-to-video" as const;
  const input: PikaV22TextToVideoInput = {
    prompt,
    negative_prompt: NEGATIVE_PROMPT,
    aspect_ratio: "9:16",
    resolution: "1080p",
    duration: "5",
  };

  const { request_id } = await fal.queue.submit(modelId, { input });
  return `${modelId}::${request_id}`;
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { variant_id, hook: inlineHook, script: inlineScript, cta: inlineCta, reference_id, preset_id, product_image_url, brand_fit } = body;

  // ── 1. Resolve variant text ───────────────────────────────────────────────
  let hook   = inlineHook   ?? "";
  let script = inlineScript ?? "";
  let cta    = inlineCta    ?? "";

  if (variant_id) {
    const { data: variant, error: varErr } = await supabase
      .from("variant_outputs")
      .select("hook, script, cta")
      .eq("id", variant_id)
      .single();

    if (varErr || !variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }
    hook   = variant.hook;
    script = variant.script;
    cta    = variant.cta;
  }

  if (!hook || !cta) {
    return NextResponse.json({ error: "hook and cta are required" }, { status: 400 });
  }

  // ── 2. Resolve style source (preset > reference > defaults) ──────────────
  let engine = "higgsfield";
  let styleCategory = "lifestyle";
  let referencePromptJson: ReferencePromptJson | null = null;
  let referenceKeyFrames: string[] = [];

  if (preset_id) {
    const preset = getPresetById(preset_id);
    if (!preset) {
      return NextResponse.json({ error: "Preset not found" }, { status: 404 });
    }
    engine = preset.engine;
    styleCategory = preset.style_category;
    referencePromptJson = { full_prompt: preset.full_prompt };
  } else if (reference_id) {
    const { data: ref, error: refErr } = await supabase
      .from("reference_library")
      .select("engine, style_category, prompt, key_frames")
      .eq("id", reference_id)
      .single();

    if (refErr || !ref) {
      return NextResponse.json({ error: "Reference not found" }, { status: 404 });
    }

    engine = ref.engine ?? "higgsfield";
    styleCategory = ref.style_category ?? "lifestyle";
    referencePromptJson = (ref.prompt as ReferencePromptJson | null) ?? null;
    referenceKeyFrames = (ref.key_frames as string[] | null) ?? [];
  }

  // Anchor image: product image takes priority, then first reference key frame
  const anchorImage: string | null =
    product_image_url ?? referenceKeyFrames[0] ?? null;

  // ── 3. Build scene prompt ─────────────────────────────────────────────────
  const scenePrompt = await buildScenePrompt({
    hook,
    script,
    cta,
    referencePromptJson,
    styleCategory,
    brandFit: brand_fit ?? null,
    hasProductImage: !!product_image_url,
  });

  // ── 4. Generate ───────────────────────────────────────────────────────────
  let taskId: string;

  try {
    if (engine === "higgsfield") {
      taskId = await generateHiggsfield(scenePrompt, anchorImage);
    } else if (engine === "kling") {
      taskId = await generateKling(scenePrompt, anchorImage);
    } else if (engine === "pika") {
      taskId = await generatePika(scenePrompt, anchorImage);
    } else {
      taskId = await generateHiggsfield(scenePrompt, anchorImage);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    console.error("[agentica/generate-video]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // ── 5. Record the job on the variant if variant_id provided ───────────────
  if (variant_id) {
    try {
    await supabase
      .from("variant_outputs")
      .update({
        video_task_id: taskId,
        video_status: "processing",
        video_engine: engine,
        video_prompt: scenePrompt,
      })
      .eq("id", variant_id);
    } catch (err: unknown) {
      console.warn("[agentica/generate-video] could not update variant:", err);
    }
        // Non-fatal — columns may not exist yet until migration is applied
  }

  return NextResponse.json({
    task_id: taskId,
    engine,
    prompt_used: scenePrompt,
    style_category: styleCategory,
  });
}
