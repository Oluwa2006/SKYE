import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { canManageAgenticaLibrary, getCurrentTeamRole } from "@/lib/team-role";
import { randomUUID } from "crypto";

export const maxDuration = 60;

// Max 200 MB
const MAX_BYTES = 200 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const admin    = createSupabaseAdmin();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getCurrentTeamRole(supabase, user);
  if (!canManageAgenticaLibrary(role)) {
    return NextResponse.json({ error: "Only admins can upload reference videos." }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!file.type.startsWith("video/")) {
    return NextResponse.json({ error: "File must be a video (MP4 recommended)" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large — max 200 MB" }, { status: 400 });
  }

  const id = randomUUID();
  const ext = file.name.split(".").pop() ?? "mp4";
  const storagePath = `reference-library/videos/${id}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to Supabase Storage (admin bypasses storage RLS)
  const { error: uploadErr } = await admin.storage
    .from("reference-library")
    .upload(storagePath, buffer, {
      contentType: file.type || "video/mp4",
      upsert: false,
    });

  if (uploadErr) {
    console.error("[reference-library/upload] storage error:", uploadErr);
    return NextResponse.json({ error: `Upload failed: ${uploadErr.message}` }, { status: 500 });
  }

  const { data: urlData } = admin.storage
    .from("reference-library")
    .getPublicUrl(storagePath);

  const videoUrl = urlData.publicUrl;

  // Insert a stub row — analysis fills in everything else
  const { data: reference, error: insertErr } = await admin
    .from("reference_library")
    .insert({
      title: file.name.replace(/\.[^.]+$/, ""), // filename without extension as temp title
      video_url: videoUrl,
      style_category: "lifestyle",              // will be overwritten by analysis
      engine: "higgsfield",                     // will be overwritten by analysis
      is_approved: false,                       // not approved until analysis passes
      approved_by: user.email,
    })
    .select("*")
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // Fire-and-forget full analysis — this fills in everything automatically
  const baseUrl = req.nextUrl.origin;
  fetch(`${baseUrl}/api/reference-library/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: req.headers.get("cookie") ?? "",
    },
    body: JSON.stringify({ reference_id: reference.id }),
  }).catch((err) => {
    console.error("[reference-library/upload] auto-analyze failed to start:", err);
  });

  return NextResponse.json({
    reference,
    analyzing: true,
    message: "Video uploaded. Analysis running in background — category, title, engine and style will be filled automatically.",
  }, { status: 201 });
}
