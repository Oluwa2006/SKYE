import { NextRequest, NextResponse } from "next/server";

const FAL_KEY = process.env.FAL_KEY_API_KEY ?? "";

export async function GET(req: NextRequest) {
  const rawTaskId = req.nextUrl.searchParams.get("taskId") ?? "";
  if (!rawTaskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  const sepIdx    = rawTaskId.indexOf("::");
  const modelId   = sepIdx !== -1 ? rawTaskId.slice(0, sepIdx) : "fal-ai/pika/v2.2/pikaframes";
  const requestId = sepIdx !== -1 ? rawTaskId.slice(sepIdx + 2) : rawTaskId;

  try {
    const statusRes = await fetch(
      `https://queue.fal.run/${modelId}/requests/${requestId}/status`,
      { headers: { Authorization: `Key ${FAL_KEY}` } }
    );
    const statusJson = await statusRes.json();
    console.log("[pika/status] raw response:", JSON.stringify(statusJson));

    const raw: string = statusJson.status ?? "IN_QUEUE";

    if (raw === "COMPLETED") {
      const resultRes = await fetch(
        `https://queue.fal.run/${modelId}/requests/${requestId}`,
        { headers: { Authorization: `Key ${FAL_KEY}` } }
      );
      const result = await resultRes.json();
      console.log("[pika/status] result:", JSON.stringify(result));
      const videoUrl: string | null =
        result.video?.url ?? result.videos?.[0]?.url ?? null;
      return NextResponse.json({ status: "succeed", videoUrl, taskId: rawTaskId });
    }

    if (raw === "FAILED") {
      return NextResponse.json({ status: "failed", videoUrl: null, taskId: rawTaskId });
    }

    return NextResponse.json({ status: "processing", videoUrl: null, taskId: rawTaskId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[pika/status] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
