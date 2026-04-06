import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import type {
  KlingVideoV2MasterImageToVideoInput,
  KlingVideoV2MasterTextToVideoInput,
} from "@fal-ai/client/endpoints";

fal.config({ credentials: process.env.FAL_KEY_API_KEY ?? "" });

export async function POST(req: NextRequest) {
  try {
    const {
      prompt, negative_prompt, aspect_ratio, duration,
      image_url,
    } = await req.json();

    const isImg2Vid = !!image_url;
    const normalizedDuration = duration === 10 || duration === "10" ? "10" : "5";
    const resolvedPrompt = prompt || "";
    const resolvedNegativePrompt = negative_prompt || "blur, distort, low quality, watermark";

    if (isImg2Vid) {
      const modelId = "fal-ai/kling-video/v2/master/image-to-video" as const;
      const input: KlingVideoV2MasterImageToVideoInput = {
        prompt: resolvedPrompt,
        image_url,
        negative_prompt: resolvedNegativePrompt,
        duration: normalizedDuration,
      };

      const { request_id } = await fal.queue.submit(modelId, { input });

      console.log("[kling/generate] request_id:", request_id);
      return NextResponse.json({ taskId: `${modelId}::${request_id}` });
    }

    const modelId = "fal-ai/kling-video/v2/master/text-to-video" as const;
    const input: KlingVideoV2MasterTextToVideoInput = {
      prompt: resolvedPrompt,
      negative_prompt: resolvedNegativePrompt,
      aspect_ratio: aspect_ratio || "9:16",
      duration: normalizedDuration,
    };

    const { request_id } = await fal.queue.submit(modelId, { input });

    console.log("[kling/generate] request_id:", request_id);
    return NextResponse.json({ taskId: `${modelId}::${request_id}` });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[kling/generate] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
