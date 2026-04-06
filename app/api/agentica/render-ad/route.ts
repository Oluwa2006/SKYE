import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { renderMediaOnLambda } from "@remotion/lambda/client";

const FUNCTION_NAME = process.env.REMOTION_FUNCTION_NAME!;
const SERVE_URL = process.env.REMOTION_SERVE_URL!;
const REGION = (process.env.REMOTION_AWS_REGION ?? "us-east-1") as "us-east-1";

const COMPOSITION_MAP: Record<string, string> = {
  cinematic: "AdCinematic",
  lifestyle: "AdLifestyle",
  product: "AdProduct",
  energetic: "AdEnergetic",
  "text-forward": "AdTextForward",
};

function resolveComposition(styleCategory: string): string {
  return COMPOSITION_MAP[styleCategory] ?? "AdLifestyle";
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!FUNCTION_NAME || !SERVE_URL) {
    return NextResponse.json(
      {
        error:
          "Remotion Lambda is not configured. Set REMOTION_FUNCTION_NAME and REMOTION_SERVE_URL.",
      },
      { status: 500 }
    );
  }

  const body = await req.json();
  const {
    variant_id,
    video_url,
    hook,
    subtext,
    cta,
    brand_name = "Agentica",
    primary_color = "#111111",
    accent_color = "#6d28d9",
    style_category = "lifestyle",
  } = body;

  if (!video_url || !hook || !cta) {
    return NextResponse.json(
      { error: "video_url, hook and cta are required" },
      { status: 400 }
    );
  }

  const compositionId = resolveComposition(style_category);

  const inputProps: Record<string, unknown> = {
    videoUrl: video_url,
    hook,
    cta,
    brandName: brand_name,
    primaryColor: primary_color,
    accentColor: accent_color,
  };

  if (subtext) {
    inputProps.subtext = subtext;
  }

  try {
    const { renderId, bucketName } = await renderMediaOnLambda({
      region: REGION,
      functionName: FUNCTION_NAME,
      serveUrl: SERVE_URL,
      composition: compositionId,
      inputProps,
      codec: "h264",
      imageFormat: "jpeg",
      maxRetries: 1,
      framesPerLambda: 40,
      privacy: "public",
    });

    if (variant_id) {
      try {
        await supabase
          .from("variant_outputs")
          .update({
            render_id: renderId,
            render_status: "rendering",
          })
          .eq("id", variant_id);
      } catch {
        // Non-fatal: these columns may not exist until the migration is applied.
      }
    }

    return NextResponse.json({
      render_id: renderId,
      bucket_name: bucketName,
      composition: compositionId,
      style_category,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Render failed";
    console.error("[agentica/render-ad]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
