import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [creatorRes, activityRes, postsRes] = await Promise.all([
    supabase.from("creators").select("*").eq("id", id).single(),
    supabase.from("creator_activity").select("*").eq("creator_id", id).order("created_at", { ascending: false }),
    supabase.from("creator_posts").select("*").eq("creator_id", id).order("posted_at", { ascending: false }),
  ]);

  if (creatorRes.error) return NextResponse.json({ error: creatorRes.error.message }, { status: 404 });

  return NextResponse.json({
    creator: creatorRes.data,
    activity: activityRes.data ?? [],
    posts: postsRes.data ?? [],
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const { logAction, logNote, ...fields } = body;

  const { data, error } = await supabase
    .from("creators")
    .update({ ...fields, last_updated: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-log activity if action provided
  if (logAction) {
    await supabase.from("creator_activity").insert([{
      creator_id: id,
      action: logAction,
      note: logNote ?? null,
    }]);
  }

  return NextResponse.json({ creator: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { error } = await supabase.from("creators").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
