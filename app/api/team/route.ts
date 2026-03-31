import { createSupabaseServer } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// GET /api/team — list all team members
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .order("invited_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ members: data ?? [] });
}

// POST /api/team — invite a teammate by email
export async function POST(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const email = (body.email ?? "").trim().toLowerCase();
  const role  = body.role ?? "member";

  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  // Check if already a member
  const { data: existing } = await supabase
    .from("team_members")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) return NextResponse.json({ error: "Already a team member" }, { status: 409 });

  const { data, error } = await supabase
    .from("team_members")
    .insert({
      email,
      role,
      status: "pending",
      invited_by: user.id,
      display_name: email.split("@")[0],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ member: data });
}

// DELETE /api/team — remove a teammate
export async function DELETE(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const { error } = await supabase.from("team_members").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
