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

async function buildScenePrompt(args: {
  hook: string;
  cta: string;
  referenceFullPrompt: string | null;
  styleCategory: string;
}): Promise<string> {
  const { hook, cta, referenceFullPrompt, styleCategory } = args;

  const styleContext = referenceFullPrompt
    ? `Reference visual style: ${referenceFullPrompt}`
    : `Visual style category: ${styleCategory}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You write concise video generation prompts for AI video engines. Return only the prompt — no explanation, no quotes, no markdown.",
      },
      {
        role: "user",
        content: `Create a single video scene prompt (max 2 sentences) for an ad with this content:
Hook: "${hook}"
CTA: "${cta}"

${styleContext}

Rules:
- Describe the VISUAL SCENE only — no text, no narration, no subtitles
- Match the reference visual style precisely
- The scene should feel like it naturally leads to the hook message
- Keep it under 60 words`,
      },
    ],
    max_tokens: 120,
    temperature: 0.4,
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
      Authorization: `Key ${apiKey}`,
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
  const { variant_id, hook: inlineHook, script: inlineScript, cta: inlineCta, reference_id, preset_id } = body;

  // ── 1. Resolve variant text ───────────────────────────────────────────────
  let hook = inlineHook ?? "";
  let script = inlineScript ?? "";
  let cta = inlineCta ?? "";

  if (variant_id) {
    const { data: variant, error: varErr } = await supabase
      .from("variant_outputs")
      .select("hook, script, cta")
      .single();

    if (varErr || !variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }
    hook = variant.hook;
    script = variant.script;
    cta = variant.cta;
  }

  if (!hook || !cta) {
    return NextResponse.json({ error: "hook and cta are required" }, { status: 400 });
  }

  // ── 2. Resolve style source (preset > reference > defaults) ──────────────
  let engine = "higgsfield";
  let styleCategory = "lifestyle";
  let thumbnailUrl: string | null = null;
  let referenceFullPrompt: string | null = null;

  if (preset_id) {
    // Hardcoded preset — instant, no DB lookup
    const preset = getPresetById(preset_id);
    if (!preset) {
      return NextResponse.json({ error: "Preset not found" }, { status: 404 });
    }
    engine = preset.engine;
    styleCategory = preset.style_category;
    referenceFullPrompt = preset.full_prompt;
    thumbnailUrl = null; // presets have no anchor image, prompt alone drives the style
  } else if (reference_id) {
    // Analyzed reference video from the library
    const { data: ref, error: refErr } = await supabase
      .from("reference_library")
      .select("engine, style_category, thumbnail_url, prompt")
      .eq("id", reference_id)
      .single();

    if (refErr || !ref) {
      return NextResponse.json({ error: "Reference not found" }, { status: 404 });
    }

    engine = ref.engine ?? "higgsfield";
    styleCategory = ref.style_category ?? "lifestyle";
    thumbnailUrl = ref.thumbnail_url ?? null;
    referenceFullPrompt = (ref.prompt as Record<string, string> | null)?.full_prompt ?? null;
  }

  // ── 3. Build scene prompt ─────────────────────────────────────────────────
  const scenePrompt = await buildScenePrompt({
    hook,
    cta,
    referenceFullPrompt,
    styleCategory,
  });

  // ── 4. Generate ───────────────────────────────────────────────────────────
  let taskId: string;

  try {
    if (engine === "higgsfield") {
      taskId = await generateHiggsfield(scenePrompt, thumbnailUrl);
    } else if (engine === "kling") {
      taskId = await generateKling(scenePrompt, thumbnailUrl);
    } else if (engine === "pika") {
      taskId = await generatePika(scenePrompt, thumbnailUrl);
    } else {
      taskId = await generateHiggsfield(scenePrompt, thumbnailUrl);
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
