import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

fal.config({ credentials: process.env.FAL_KEY_API_KEY ?? "" });

export async function POST(req: NextRequest) {
  try {
    const {
      prompt, negative_prompt, aspect_ratio, duration,
      image_url,
      camera_control,
    } = await req.json();

    const isImg2Vid = !!image_url;
    const modelId = isImg2Vid
      ? "fal-ai/kling-video/v2/master/image-to-video"
      : "fal-ai/kling-video/v2/master/text-to-video";

    const input: Record<string, unknown> = {
      prompt:          prompt || "",
      negative_prompt: negative_prompt || "blur, distort, low quality, watermark",
      aspect_ratio:    aspect_ratio || "9:16",
      duration:        String(duration || 5),
    };

    if (isImg2Vid) input.image_url = image_url;

    if (!isImg2Vid && camera_control?.type && camera_control.type !== "static") {
      input.camera_control = { type: camera_control.type };
    }

    const { request_id } = await fal.queue.submit(modelId, { input });

    console.log("[kling/generate] request_id:", request_id);
    return NextResponse.json({ taskId: `${modelId}::${request_id}` });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[kling/generate] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
