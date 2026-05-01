import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const maxDuration = 60;

// ─── Background removal via remove.bg ────────────────────────────────────────
// Returns a Buffer of the resulting PNG, or throws on failure.
async function removeBackground(imageUrl: string): Promise<Buffer> {
  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) throw new Error("REMOVE_BG_API_KEY not configured");

  const body = new FormData();
  body.append("image_url",   imageUrl);
  body.append("size",        "auto");   // let remove.bg pick the best resolution
  body.append("format",      "png");
  body.append("type",        "product"); // optimised for packaged products/objects

  const res = await fetch("https://api.remove.bg/v1.0/removebg", {
    method:  "POST",
    headers: { "X-Api-Key": apiKey },
    body,
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`remove.bg error ${res.status}: ${msg}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

// ─── Upload processed PNG to Supabase Storage ─────────────────────────────────
async function storeProcessedImage(
  pngBuffer: Buffer,
  userId:    string,
): Promise<string> {
  const admin    = createSupabaseAdmin();
  const filename = `ad-products/processed/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;

  const { error } = await admin.storage
    .from("brand-assets")
    .upload(filename, pngBuffer, { contentType: "image/png", upsert: false });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = admin.storage.from("brand-assets").getPublicUrl(filename);
  return data.publicUrl;
}

// ─── Route ────────────────────────────────────────────────────────────────────
// POST { image_url: string }
// → { processed_url: string; had_background_removed: boolean }
//
// If remove.bg is not configured or fails, returns the original URL unchanged
// so the rest of the pipeline still works — degraded but never broken.
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { image_url } = body as { image_url?: string };

  if (!image_url || typeof image_url !== "string") {
    return NextResponse.json({ error: "image_url is required" }, { status: 400 });
  }

  // ── Skip if already a transparent PNG from our storage ───────────────────
  // Avoids double-processing if the user re-submits the same cleaned image.
  if (image_url.includes("/ad-products/processed/")) {
    return NextResponse.json({ processed_url: image_url, had_background_removed: false });
  }

  // ── Attempt background removal ────────────────────────────────────────────
  try {
    const pngBuffer    = await removeBackground(image_url);
    const processedUrl = await storeProcessedImage(pngBuffer, user.id);
    return NextResponse.json({ processed_url: processedUrl, had_background_removed: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Processing failed";
    console.error("[product/process-image]", message);

    // Graceful fallback — return original so downstream render still works
    return NextResponse.json({
      processed_url:          image_url,
      had_background_removed: false,
      warning:                message,
    });
  }
}
