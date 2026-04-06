import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import type {
  PikaV15PikaffectsInput,
  PikaV22ImageToVideoInput,
  PikaV22TextToVideoInput,
} from "@fal-ai/client/endpoints";

fal.config({ credentials: process.env.FAL_KEY_API_KEY ?? "" });

const VALID_PIKAFFECTS = new Set<PikaV15PikaffectsInput["pikaffect"]>([
  "Cake-ify",
  "Crumble",
  "Crush",
  "Decapitate",
  "Deflate",
  "Dissolve",
  "Explode",
  "Eye-pop",
  "Inflate",
  "Levitate",
  "Melt",
  "Peel",
  "Poke",
  "Squish",
  "Ta-da",
  "Tear",
]);

export async function POST(req: NextRequest) {
  try {
    const {
      prompt, negative_prompt, aspect_ratio, duration,
      image_url,
      pikaffect,
    } = await req.json();

    const normalizedDuration = duration === 10 || duration === "10" ? "10" : "5";
    const resolvedPrompt = prompt || "";
    const resolvedNegativePrompt = negative_prompt || "blur, distort, low quality, watermark";

    if (pikaffect && pikaffect !== "none") {
      if (!image_url) {
        return NextResponse.json(
          { error: "image_url is required when using pikaffect" },
          { status: 400 }
        );
      }

      if (!VALID_PIKAFFECTS.has(pikaffect)) {
        return NextResponse.json({ error: "Invalid pikaffect value" }, { status: 400 });
      }

      const modelId = "fal-ai/pika/v1.5/pikaffects" as const;
      const input: PikaV15PikaffectsInput = {
        image_url,
        pikaffect,
        prompt: resolvedPrompt,
        negative_prompt: resolvedNegativePrompt,
      };

      const { request_id } = await fal.queue.submit(modelId, { input });

      console.log("[pika/generate] request_id:", request_id);
      return NextResponse.json({ taskId: `${modelId}::${request_id}` });
    }

    if (image_url) {
      const modelId = "fal-ai/pika/v2.2/image-to-video" as const;
      const input: PikaV22ImageToVideoInput = {
        image_url,
        prompt: resolvedPrompt,
        negative_prompt: resolvedNegativePrompt,
        resolution: "1080p",
        duration: normalizedDuration,
      };

      const { request_id } = await fal.queue.submit(modelId, { input });

      console.log("[pika/generate] request_id:", request_id);
      return NextResponse.json({ taskId: `${modelId}::${request_id}` });
    }

    const modelId = "fal-ai/pika/v2.2/text-to-video" as const;
    const input: PikaV22TextToVideoInput = {
      prompt: resolvedPrompt,
      negative_prompt: resolvedNegativePrompt,
      aspect_ratio: aspect_ratio || "9:16",
      resolution: "1080p",
      duration: normalizedDuration,
    };

    const { request_id } = await fal.queue.submit(modelId, { input });

    console.log("[pika/generate] request_id:", request_id);
    return NextResponse.json({ taskId: `${modelId}::${request_id}` });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[pika/generate] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
