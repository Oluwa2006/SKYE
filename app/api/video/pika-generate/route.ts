import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

fal.config({ credentials: process.env.FAL_KEY_API_KEY ?? "" });

export async function POST(req: NextRequest) {
  try {
    const {
      prompt, negative_prompt, aspect_ratio, duration,
      image_url,
      pikaffect,
    } = await req.json();

    const isImg2Vid = !!image_url;
    // pikaframes handles both text-to-video and image-to-video
    const modelId = "fal-ai/pika/v2.2/pikaframes";

    const input: Record<string, unknown> = {
      prompt:          prompt || "",
      negative_prompt: negative_prompt || "blur, distort, low quality, watermark",
      aspect_ratio:    aspect_ratio || "9:16",
      duration:        Number(duration) || 5,
    };

    if (isImg2Vid) input.image_url = image_url;
    if (pikaffect && pikaffect !== "none") input.pikaffect = pikaffect;

    const { request_id } = await fal.queue.submit(modelId, { input });

    console.log("[pika/generate] request_id:", request_id);
    return NextResponse.json({ taskId: `${modelId}::${request_id}` });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[pika/generate] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
