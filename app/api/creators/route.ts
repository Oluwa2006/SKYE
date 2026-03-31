import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("creators")
    .select("*")
    .order("added_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ creators: data ?? [] });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      handle, name, platform = "instagram", location,
      followers = 0, engagement_rate = 0, avg_views = 0, posts_per_week = 0,
      niche_tags = [], brand_fit_score = 0,
      est_cost_min = 0, est_cost_max = 0,
      pipeline_stage = "Discovered",
    } = body;

    if (!handle) return NextResponse.json({ error: "handle is required" }, { status: 400 });

    const { data, error } = await supabase
      .from("creators")
      .insert([{
        handle, name, platform, location,
        followers, engagement_rate, avg_views, posts_per_week,
        niche_tags, brand_fit_score,
        est_cost_min, est_cost_max,
        pipeline_stage,
      }])
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Log the creation activity
    await supabase.from("creator_activity").insert([{
      creator_id: data.id,
      action: "Created",
      note: `Added to pipeline at stage: ${pipeline_stage}`,
    }]);

    return NextResponse.json({ creator: data });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
