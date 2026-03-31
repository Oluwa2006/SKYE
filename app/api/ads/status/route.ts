import { NextRequest, NextResponse } from "next/server";
import { getRenderProgress } from "@remotion/lambda/client";

const REGION = (process.env.REMOTION_AWS_REGION ?? "us-east-1") as "us-east-1";

export async function GET(req: NextRequest) {
  const renderId  = req.nextUrl.searchParams.get("renderId") ?? "";
  const bucketName = req.nextUrl.searchParams.get("bucketName") ?? "";

  if (!renderId || !bucketName) {
    return NextResponse.json({ error: "renderId and bucketName required" }, { status: 400 });
  }

  try {
    const progress = await getRenderProgress({
      renderId,
      bucketName,
      functionName: process.env.REMOTION_FUNCTION_NAME!,
      region: REGION,
    });

    if (progress.fatalErrorEncountered) {
      return NextResponse.json({ status: "error", error: progress.errors?.[0]?.message ?? "Render failed" });
    }

    if (progress.done) {
      return NextResponse.json({ status: "done", url: progress.outputFile });
    }

    return NextResponse.json({
      status: "rendering",
      progress: Math.round((progress.overallProgress ?? 0) * 100),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Status check failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
