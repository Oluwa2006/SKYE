import { NextRequest, NextResponse } from "next/server";

const BASE_URL = "https://platform.higgsfield.ai";

export async function POST(req: NextRequest) {
  const apiKey = process.env.HIGGSFIELD_API_KEY;
  if (!apiKey || apiKey === "your_higgsfield_key_here") {
    return NextResponse.json({ error: "HIGGSFIELD_API_KEY not configured" }, { status: 500 });
  }

  try {
    const {
      prompt,
      negative_prompt,
      duration,
      image_url,
      motion_id,
      motion_strength = 0.8,
      model = "dop-preview",
    } = await req.json();

    const body: Record<string, unknown> = {
      model,
      prompt: prompt || "",
      duration: Math.min(Number(duration) || 5, 15),
      resolution: "1080p",
      enhance_prompt: true,
      check_nsfw: false,
      motion_strength,
    };

    if (negative_prompt) body.negative_prompt = negative_prompt;
    if (motion_id)       body.motion_id = motion_id;

    // Higgsfield image-to-video
    if (image_url) {
      body.input_images = [{ type: "image_url", image_url }];
    }

    const res = await fetch(`${BASE_URL}/v1/image2video/dop`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[higgsfield/generate] error:", res.status, errText);
      return NextResponse.json({ error: `Higgsfield error ${res.status}: ${errText}` }, { status: 500 });
    }

    const data = await res.json();
    const requestId = data.id ?? data.request_id ?? data.requestId;

    if (!requestId) {
      console.error("[higgsfield/generate] no requestId:", data);
      return NextResponse.json({ error: "No request ID returned" }, { status: 500 });
    }

    console.log("[higgsfield/generate] requestId:", requestId);
    return NextResponse.json({ taskId: `higgsfield::${requestId}` });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[higgsfield/generate]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
