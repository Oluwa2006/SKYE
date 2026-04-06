import { NextRequest, NextResponse } from "next/server";

const BASE_URL = "https://platform.higgsfield.ai";

export async function GET(req: NextRequest) {
  const apiKey = process.env.HIGGSFIELD_API_KEY;
  if (!apiKey || apiKey === "your_higgsfield_key_here") {
    return NextResponse.json({ error: "HIGGSFIELD_API_KEY not configured" }, { status: 500 });
  }

  const rawTaskId = req.nextUrl.searchParams.get("taskId") ?? "";
  if (!rawTaskId) {
    return NextResponse.json({ error: "taskId required" }, { status: 400 });
  }

  // taskId format: "higgsfield::{requestId}"
  const requestId = rawTaskId.replace("higgsfield::", "");

  try {
    const res = await fetch(`${BASE_URL}/requests/${requestId}/status`, {
      headers: { Authorization: `Key ${apiKey}` },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[higgsfield/status] error:", res.status, errText);
      return NextResponse.json({ error: `Higgsfield status error ${res.status}` }, { status: 500 });
    }

    const data = await res.json();
    const status = (data.status as string)?.toLowerCase();

    console.log("[higgsfield/status]", status);

    if (status === "completed") {
      // Try multiple possible response shapes
      const videoUrl =
        data.video_url ??
        data.output?.video_url ??
        data.result?.video_url ??
        data.url ??
        null;
      return NextResponse.json({ status: "succeed", videoUrl, taskId: rawTaskId });
    }

    if (status === "failed" || status === "nsfw" || status === "cancelled") {
      return NextResponse.json({ status: "failed", videoUrl: null, taskId: rawTaskId });
    }

    // queued | in_progress
    return NextResponse.json({ status: "processing", videoUrl: null, taskId: rawTaskId });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[higgsfield/status]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
