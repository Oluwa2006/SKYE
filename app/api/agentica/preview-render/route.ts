import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { renderMediaOnLambda } from "@remotion/lambda/client";

const FUNCTION_NAME = process.env.REMOTION_FUNCTION_NAME!;
const SERVE_URL     = process.env.REMOTION_SERVE_URL!;
const REGION        = (process.env.REMOTION_AWS_REGION ?? "us-east-1") as "us-east-1";

export const maxDuration = 60;

// ─── Preview render — first 3 seconds only (frames 0-89 at 30fps) ─────────────
// Costs ~10% of a full render. Used to validate schema visuals before committing
// to the full Lambda job. Accepts the same body shape as /agentica/render-ad.

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!FUNCTION_NAME || !SERVE_URL) {
    return NextResponse.json({ error: "Remotion Lambda is not configured" }, { status: 500 });
  }

  const body = await req.json();
  const { ad_schema, composition, background_video_url } = body;

  // Determine composition
  let compositionId = "AdMeta";
  let inputProps: Record<string, unknown> = {};

  if (composition === "AdVideoOverlay" || background_video_url) {
    compositionId = "AdVideoOverlay";
    inputProps = {
      backgroundVideoUrl: background_video_url,
      imageUrl:           body.image_url ?? "",
      imageX:             body.image_x      ?? 10,
      imageY:             body.image_y      ?? 15,
      imageWidth:         body.image_width  ?? 80,
      imageHeight:        body.image_height ?? 55,
      imageStartSec:      body.image_start_sec ?? 0,
      imageEndSec:        body.image_end_sec   ?? 0,
      imageEntrance:      body.image_entrance  ?? "scale",
      durationSec:        body.duration_sec    ?? 15,
    };
  } else if (ad_schema) {
    compositionId = "AdMeta";
    inputProps = { schema: ad_schema };
  } else {
    return NextResponse.json({ error: "ad_schema or background_video_url is required" }, { status: 400 });
  }

  try {
    const { renderId, bucketName } = await renderMediaOnLambda({
      region:          REGION,
      functionName:    FUNCTION_NAME,
      serveUrl:        SERVE_URL,
      composition:     compositionId,
      inputProps,
      codec:           "h264",
      imageFormat:     "png",
      maxRetries:      1,
      framesPerLambda: 30,     // tiny job — one Lambda worker handles it all
      frameRange:      [0, 89], // first 3 seconds at 30fps
      privacy:         "public",
    });

    return NextResponse.json({
      render_id:   renderId,
      bucket_name: bucketName,
      composition: compositionId,
      preview:     true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Preview render failed";
    console.error("[agentica/preview-render]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
