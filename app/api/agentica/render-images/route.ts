import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { renderMediaOnLambda } from "@remotion/lambda/client";

const FUNCTION_NAME = process.env.REMOTION_FUNCTION_NAME!;
const SERVE_URL     = process.env.REMOTION_SERVE_URL!;
const REGION        = (process.env.REMOTION_AWS_REGION ?? "us-east-1") as "us-east-1";

// ─── Render a product image ad without any video engine ──────────────────────
//
// Takes product image URLs + ad copy → renders AdProductImages composition
// via Remotion Lambda. No Higgsfield/Kling/Pika credit needed.
// Returns render_id + bucket_name for polling via /api/agentica/render-status.

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!FUNCTION_NAME || !SERVE_URL) {
    return NextResponse.json(
      { error: "Remotion Lambda is not configured. Set REMOTION_FUNCTION_NAME and REMOTION_SERVE_URL." },
      { status: 500 },
    );
  }

  const body = await req.json();
  const {
    variant_id,
    images,
    hook,
    subtext,
    cta,
    brand_name     = "Agentica",
    primary_color  = "#1d4ed8",
    accent_color   = "#60a5fa",
    style_category = "product",
  } = body;

  if (!images || !Array.isArray(images) || images.length === 0) {
    return NextResponse.json({ error: "images array is required" }, { status: 400 });
  }
  if (!hook || !cta) {
    return NextResponse.json({ error: "hook and cta are required" }, { status: 400 });
  }

  const inputProps: Record<string, unknown> = {
    images:        images.slice(0, 4),
    hook,
    cta,
    brandName:     brand_name,
    primaryColor:  primary_color,
    accentColor:   accent_color,
    styleCategory: style_category,
  };
  if (subtext) inputProps.subtext = subtext;

  try {
    const { renderId, bucketName } = await renderMediaOnLambda({
      region:           REGION,
      functionName:     FUNCTION_NAME,
      serveUrl:         SERVE_URL,
      composition:      "AdProductImages",
      inputProps,
      codec:            "h264",
      imageFormat:      "jpeg",
      maxRetries:       1,
      framesPerLambda:  40,
      privacy:          "public",
    });

    if (variant_id) {
      try {
        await supabase
          .from("variant_outputs")
          .update({ render_id: renderId, render_status: "rendering" })
          .eq("id", variant_id);
      } catch { /* non-fatal */ }
    }

    return NextResponse.json({
      render_id:   renderId,
      bucket_name: bucketName,
      composition: "AdProductImages",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Render failed";
    console.error("[agentica/render-images]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
