import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { fal } from "@fal-ai/client";

fal.config({ credentials: process.env.FAL_KEY_API_KEY ?? "" });

const HIGGSFIELD_BASE = "https://platform.higgsfield.ai";

async function pollHiggsfield(
  taskId: string
): Promise<{ status: string; videoUrl: string | null }> {
  const apiKey = process.env.HIGGSFIELD_API_KEY ?? "";
  const requestId = taskId.replace("higgsfield::", "");

  const res = await fetch(`${HIGGSFIELD_BASE}/requests/${requestId}/status`, {
    headers: { Authorization: `Key ${apiKey}` },
  });

  if (!res.ok) {
    throw new Error(`Higgsfield status error ${res.status}`);
  }

  const data = await res.json();
  const status = (data.status as string)?.toLowerCase();

  if (status === "completed") {
    const videoUrl =
      data.video_url ??
      data.output?.video_url ??
      data.result?.video_url ??
      data.url ??
      null;

    return { status: "succeed", videoUrl };
  }

  if (status === "failed" || status === "nsfw" || status === "cancelled") {
    return { status: "failed", videoUrl: null };
  }

  return { status: "processing", videoUrl: null };
}

async function pollFal(
  taskId: string
): Promise<{ status: string; videoUrl: string | null }> {
  const sepIdx = taskId.indexOf("::");
  const modelId = taskId.slice(0, sepIdx);
  const requestId = taskId.slice(sepIdx + 2);

  const status = await fal.queue.status(modelId, { requestId, logs: false });

  if (status.status === "COMPLETED") {
    const result = (await fal.queue.result(modelId, {
      requestId,
    })) as Record<string, unknown>;
    const data = (result.data ?? result) as Record<string, unknown>;
    const video = data.video as Record<string, unknown> | undefined;
    const videoUrl = (video?.url ?? null) as string | null;
    return { status: "succeed", videoUrl };
  }

  return { status: "processing", videoUrl: null };
}

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const taskId = req.nextUrl.searchParams.get("taskId") ?? "";
  const variantId = req.nextUrl.searchParams.get("variant_id") ?? "";

  if (!taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  try {
    const result = taskId.startsWith("higgsfield::")
      ? await pollHiggsfield(taskId)
      : await pollFal(taskId);

    if (variantId && result.status !== "processing") {
      try {
        await supabase
          .from("variant_outputs")
          .update({
            video_status: result.status === "succeed" ? "ready" : "failed",
            video_url: result.videoUrl ?? null,
          })
          .eq("id", variantId);
      } catch {}
    }

    return NextResponse.json({ ...result, task_id: taskId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Status check failed";
    console.error("[agentica/video-status]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
