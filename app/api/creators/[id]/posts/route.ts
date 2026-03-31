import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const {
    post_url, thumbnail_url, caption,
    likes = 0, comments = 0, views = 0,
    posted_at, content_pillar,
  } = body;

  const estimated_reach = Math.round(views * 1.1);

  const { data, error } = await supabase
    .from("creator_posts")
    .insert([{
      creator_id: id,
      post_url, thumbnail_url, caption,
      likes, comments, views, estimated_reach,
      posted_at: posted_at ?? new Date().toISOString(),
      content_pillar,
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ post: data });
}
