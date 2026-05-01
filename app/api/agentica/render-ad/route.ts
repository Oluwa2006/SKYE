import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { renderMediaOnLambda } from "@remotion/lambda/client";

const FUNCTION_NAME = process.env.REMOTION_FUNCTION_NAME!;
const SERVE_URL = process.env.REMOTION_SERVE_URL!;
const REGION = (process.env.REMOTION_AWS_REGION ?? "us-east-1") as "us-east-1";

const COMPOSITION_MAP: Record<string, string> = {
  cinematic:      "AdCinematic",
  lifestyle:      "AdLifestyle",
  product:        "AdProduct",
  energetic:      "AdEnergetic",
  "text-forward": "AdTextForward",
  spotlight:      "AdProductSpotlight",
  swap:           "AdBurgerSwap",
};

// Valid composition IDs that can be passed directly
const VALID_COMPOSITIONS = new Set([
  "AdMeta",
  "AdProductSpotlight",
  "AdBurgerSwap",
  "AdCinematic",
  "AdLifestyle",
  "AdProduct",
  "AdEnergetic",
  "AdTextForward",
  "AdProductImages",
]);

function resolveComposition(compositionId: string | undefined, styleCategory: string): string {
  if (compositionId && VALID_COMPOSITIONS.has(compositionId)) return compositionId;
  return COMPOSITION_MAP[styleCategory] ?? "AdProductSpotlight";
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
    composition,
    // ── AdMeta props ──────────────────────────────────────────────────────────
    ad_schema,
    // ── AdVideoOverlay props ──────────────────────────────────────────────────
    background_video_url,
    image_url,
    image_x,
    image_y,
    image_width,
    image_height,
    image_start_sec,
    image_end_sec,
    image_entrance,
    duration_sec,
    // ── Legacy / other composition props ─────────────────────────────────────
    video_url,
    hook,
    headline,
    subtext,
    cta,
    cta_text,
    brand_name    = "Agentica",
    primary_color = "#ffffff",
    accent_color  = "#1d4ed8",
    style_category = "spotlight",
  } = body;

  // ── AdMeta path ───────────────────────────────────────────────────────────
  if (composition === "AdMeta" || ad_schema) {
    if (!ad_schema) {
      return NextResponse.json({ error: "ad_schema is required for AdMeta" }, { status: 400 });
    }
    try {
      const { renderId, bucketName } = await renderMediaOnLambda({
        region: REGION,
        functionName: FUNCTION_NAME,
        serveUrl: SERVE_URL,
        composition: "AdMeta",
        inputProps: { schema: ad_schema },
        codec: "h264",
        imageFormat: "jpeg",
        maxRetries: 1,
        framesPerLambda: 200,
        privacy: "public",
      });

      if (variant_id) {
        try {
          await supabase.from("variant_outputs").update({ render_id: renderId, render_status: "rendering" }).eq("id", variant_id);
        } catch { /* non-fatal */ }
      }

      return NextResponse.json({ render_id: renderId, bucket_name: bucketName, composition: "AdMeta" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Render failed";
      console.error("[agentica/render-ad/admeta]", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // ── AdVideoOverlay path ───────────────────────────────────────────────────
  if (composition === "AdVideoOverlay" || background_video_url) {
    if (!background_video_url) {
      return NextResponse.json({ error: "background_video_url is required for AdVideoOverlay" }, { status: 400 });
    }
    if (!image_url) {
      return NextResponse.json({ error: "image_url is required for AdVideoOverlay" }, { status: 400 });
    }

    const inputProps: Record<string, unknown> = {
      backgroundVideoUrl: background_video_url,
      imageUrl:           image_url,
      imageX:             image_x      ?? 10,
      imageY:             image_y      ?? 15,
      imageWidth:         image_width  ?? 80,
      imageHeight:        image_height ?? 55,
      imageStartSec:      image_start_sec ?? 0,
      imageEndSec:        image_end_sec   ?? 0,
      imageEntrance:      image_entrance  ?? "scale",
      durationSec:        duration_sec    ?? 15,
    };

    try {
      const { renderId, bucketName } = await renderMediaOnLambda({
        region: REGION,
        functionName: FUNCTION_NAME,
        serveUrl: SERVE_URL,
        composition: "AdVideoOverlay",
        inputProps,
        codec: "h264",
        imageFormat: "jpeg",
        maxRetries: 1,
        framesPerLambda: 200,
        privacy: "public",
      });

      if (variant_id) {
        try {
          await supabase.from("variant_outputs").update({ render_id: renderId, render_status: "rendering" }).eq("id", variant_id);
        } catch { /* non-fatal */ }
      }

      return NextResponse.json({ render_id: renderId, bucket_name: bucketName, composition: "AdVideoOverlay" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Render failed";
      console.error("[agentica/render-ad/overlay]", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // ── Standard composition path ─────────────────────────────────────────────
  const resolvedHook = hook ?? headline ?? "";
  const resolvedCta  = cta  ?? cta_text  ?? "";

  if (!resolvedHook || !resolvedCta) {
    return NextResponse.json(
      { error: "hook/headline and cta/cta_text are required" },
      { status: 400 }
    );
  }

  if (!video_url && !image_url) {
    return NextResponse.json(
      { error: "Either video_url or image_url is required" },
      { status: 400 }
    );
  }

  const compositionId = resolveComposition(composition, style_category);

  const inputProps: Record<string, unknown> = {
    hook:         resolvedHook,
    headline:     resolvedHook,
    cta:          resolvedCta,
    ctaText:      resolvedCta,
    brandName:    brand_name,
    primaryColor: primary_color,
    accentColor:  accent_color,
  };

  if (video_url) inputProps.videoUrl = video_url;
  if (image_url) inputProps.imageUrl = image_url;
  if (subtext)   inputProps.subtext  = subtext;

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
      framesPerLambda: 200,
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
