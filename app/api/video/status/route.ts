import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

fal.config({ credentials: process.env.FAL_KEY_API_KEY ?? "" });

export async function GET(req: NextRequest) {
  const rawTaskId = req.nextUrl.searchParams.get("taskId") ?? "";
  if (!rawTaskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  const sepIdx = rawTaskId.indexOf("::");
  const modelId   = rawTaskId.slice(0, sepIdx);
  const requestId = rawTaskId.slice(sepIdx + 2);

  try {
    const status = await fal.queue.status(modelId, { requestId, logs: false });
    console.log("[kling/status]", status.status);

    if (status.status === "COMPLETED") {
      const result = await fal.queue.result(modelId, { requestId }) as Record<string, unknown>;
      console.log("[kling/status] result:", JSON.stringify(result));
      const data = (result.data ?? result) as Record<string, unknown>;
      const video = data.video as Record<string, unknown> | undefined;
      const videoUrl = (video?.url ?? null) as string | null;
      return NextResponse.json({ status: "succeed", videoUrl, taskId: rawTaskId });
    }

    if (status.status === "FAILED") {
      return NextResponse.json({ status: "failed", videoUrl: null, taskId: rawTaskId });
    }

    return NextResponse.json({ status: "processing", videoUrl: null, taskId: rawTaskId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[kling/status] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
