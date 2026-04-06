import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getRenderProgress } from "@remotion/lambda/client";

const REGION = (process.env.REMOTION_AWS_REGION ?? "us-east-1") as "us-east-1";

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const renderId = req.nextUrl.searchParams.get("render_id") ?? "";
  const bucketName = req.nextUrl.searchParams.get("bucket_name") ?? "";
  const variantId = req.nextUrl.searchParams.get("variant_id") ?? "";

  if (!renderId || !bucketName) {
    return NextResponse.json(
      { error: "render_id and bucket_name are required" },
      { status: 400 }
    );
  }

  try {
    const progress = await getRenderProgress({
      renderId,
      bucketName,
      functionName: process.env.REMOTION_FUNCTION_NAME!,
      region: REGION,
    });

    if (progress.fatalErrorEncountered) {
      if (variantId) {
        try {
          await supabase
            .from("variant_outputs")
            .update({ render_status: "failed" })
            .eq("id", variantId);
        } catch {}
      }

      return NextResponse.json({ status: "failed", outputUrl: null });
    }

    if (progress.done) {
      const outputUrl = progress.outputFile ?? null;

      if (variantId && outputUrl) {
        try {
          await supabase
            .from("variant_outputs")
            .update({ render_status: "done", final_video_url: outputUrl })
            .eq("id", variantId);
        } catch {}
      }

      return NextResponse.json({ status: "done", outputUrl, progress: 1 });
    }

    return NextResponse.json({
      status: "rendering",
      outputUrl: null,
      progress: progress.overallProgress ?? 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Status check failed";
    console.error("[agentica/render-status]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
