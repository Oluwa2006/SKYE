import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { followers, avg_likes, avg_comments } = body;

  const engagement_rate =
    followers > 0 ? parseFloat(((avg_likes / followers) * 100).toFixed(2)) : 0;

  const { data, error } = await supabase
    .from("social_accounts")
    .update({ followers, avg_likes, avg_comments, engagement_rate, last_updated: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("social_snapshots").insert([{
    account_id: id,
    followers,
    avg_likes,
    engagement_rate,
  }]);

  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await supabase.from("social_accounts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
