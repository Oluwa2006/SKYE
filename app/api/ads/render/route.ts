import { NextRequest, NextResponse } from "next/server";
import { renderMediaOnLambda, getRenderProgress } from "@remotion/lambda/client";

const FUNCTION_NAME = process.env.REMOTION_FUNCTION_NAME!;
const SERVE_URL     = process.env.REMOTION_SERVE_URL!;
const REGION        = (process.env.REMOTION_AWS_REGION ?? "us-east-1") as "us-east-1";

export async function POST(req: NextRequest) {
  const { compositionId, inputProps } = await req.json();

  if (!compositionId || !inputProps) {
    return NextResponse.json({ error: "compositionId and inputProps required" }, { status: 400 });
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

    return NextResponse.json({ renderId, bucketName });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Render failed";
    console.error("[ads/render]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
