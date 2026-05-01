import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { fal } from "@fal-ai/client";
import type { trellisOutput } from "@fal-ai/client/endpoints";
type triposrOutput = { model_mesh: { url: string }; timings: unknown };

fal.config({ credentials: process.env.FAL_KEY_API_KEY ?? "" });

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("job_id");
  if (!jobId) return NextResponse.json({ error: "job_id is required" }, { status: 400 });

  const isTrellis = jobId.startsWith("fal-ai/trellis::");
  const modelId   = isTrellis ? "fal-ai/trellis" as const : "fal-ai/triposr" as const;
  const requestId = jobId.replace(`${modelId}::`, "");

  try {
    const status = await fal.queue.status(modelId, { requestId, logs: false });

    if (status.status === "COMPLETED") {
      if (isTrellis) {
        const result = await fal.queue.result("fal-ai/trellis", { requestId });
        const output = result as unknown as trellisOutput;
        const modelUrl = (output.model_mesh as unknown as { url: string }).url ?? null;
        return NextResponse.json({ status: "done", model_url: modelUrl });
      } else {
        const result = await fal.queue.result("fal-ai/triposr", { requestId });
        const output = result as unknown as triposrOutput;
        const modelUrl = (output.model_mesh as unknown as { url: string }).url ?? null;
        return NextResponse.json({ status: "done", model_url: modelUrl });
      }
    }

    // IN_QUEUE or IN_PROGRESS
    const queuePos = (status as { queue_position?: number }).queue_position;
    return NextResponse.json({ status: "processing", queue_position: queuePos ?? null });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Status check failed";
    // If the job explicitly failed, fal throws — treat as failed
    if (message.toLowerCase().includes("failed") || message.toLowerCase().includes("error")) {
      return NextResponse.json({ status: "failed", error: message });
    }
    console.error("[product/3d-status]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
