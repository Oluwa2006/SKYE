import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabase-server";

// Admin client — bypasses RLS for insert
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// GET — fetch all active templates (public read)
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("ad_templates")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data ?? [] });
}

// POST — save a completed render as a template
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    name,
    composition_id,
    video_url,
    duration,
    accent_color,
    bg_color,
    description,
    text_slots,
    required_angle,
    angle_hint,
    // AdVideoOverlay-specific fields
    background_video_url,
    overlay_config,
    duration_sec,
    // AdMeta-specific field
    ad_schema,
  } = body;

  if (!name || !composition_id || !video_url) {
    return NextResponse.json(
      { error: "name, composition_id, and video_url are required" },
      { status: 400 },
    );
  }

  const row: Record<string, unknown> = {
    name,
    composition_id,
    video_url,
    duration:       duration      ?? "15s",
    accent_color:   accent_color  ?? "#1d4ed8",
    bg_color:       bg_color      ?? "#eff6ff",
    description:    description   ?? null,
    text_slots:     text_slots    ?? [],
    required_angle: required_angle ?? "any",
    angle_hint:     angle_hint    ?? "Product photo",
  };

  if (background_video_url !== undefined) row.background_video_url = background_video_url;
  if (overlay_config       !== undefined) row.overlay_config       = overlay_config;
  if (duration_sec         !== undefined) row.duration_sec         = duration_sec;
  if (ad_schema            !== undefined) row.ad_schema            = ad_schema;

  const { data, error } = await adminClient()
    .from("ad_templates")
    .insert(row)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data });
}

// DELETE — deactivate (soft delete) a template
export async function DELETE(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await adminClient()
    .from("ad_templates")
    .update({ is_active: false })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
