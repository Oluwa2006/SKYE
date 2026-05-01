import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { fal } from "@fal-ai/client";

fal.config({ credentials: process.env.FAL_KEY_API_KEY ?? "" });

export const maxDuration = 60;

// ─── 3D model generation ──────────────────────────────────────────────────────
// Trellis (primary) — generates a GLB mesh from a single product image.
// Falls back to TripoSR if Trellis is unavailable.
//
// Returns a job_id to poll via /api/product/3d-status.
// The final output is a .glb URL loaded in a <model-viewer> in the browser
// where the user freely rotates and captures the angle they want.

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { image_url } = body as { image_url?: string };

  if (!image_url) {
    return NextResponse.json({ error: "image_url is required" }, { status: 400 });
  }

  try {
    const { request_id } = await fal.queue.submit("fal-ai/trellis", {
      input: {
        image_url,
        ss_guidance_strength: 7.5,
        ss_sampling_steps:    12,
        slat_guidance_strength: 3,
        slat_sampling_steps:  12,
        texture_size:         "1024",
        seed:                 42,
      },
    });

    return NextResponse.json({
      job_id:  `fal-ai/trellis::${request_id}`,
      model:   "trellis",
      status:  "queued",
    });
  } catch {
    // Fallback to TripoSR
    try {
      const { request_id } = await fal.queue.submit("fal-ai/triposr", {
        input: {
          image_url,
          do_remove_background: false,
          output_format:        "glb",
        },
      });

      return NextResponse.json({
        job_id:  `fal-ai/triposr::${request_id}`,
        model:   "triposr",
        status:  "queued",
      });
    } catch (fallbackErr) {
      const message = fallbackErr instanceof Error ? fallbackErr.message : "3D generation failed";
      console.error("[product/generate-3d]", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
}
