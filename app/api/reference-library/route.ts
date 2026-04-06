import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { canManageAgenticaLibrary, getCurrentTeamRole } from "@/lib/team-role";

const VALID_CATEGORIES = ["cinematic", "lifestyle", "product", "text-forward", "energetic"] as const;

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  let query = supabase
    .from("reference_library")
    .select("id, title, video_url, thumbnail_url, style_category, engine, prompt, tags, date_added")
    .eq("is_approved", true)
    .order("date_added", { ascending: false });

  if (category && VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number])) {
    query = query.eq("style_category", category);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ references: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getCurrentTeamRole(supabase, user);
  if (!canManageAgenticaLibrary(role)) {
    return NextResponse.json({ error: "Only admins can add reference videos." }, { status: 403 });
  }

  const body = await req.json();
  const { title, video_url, thumbnail_url, style_category, engine, prompt, tags } = body;

  if (!title || !video_url || !style_category || !engine) {
    return NextResponse.json(
      { error: "Missing required fields: title, video_url, style_category, engine" },
      { status: 400 },
    );
  }

  if (!VALID_CATEGORIES.includes(style_category)) {
    return NextResponse.json({ error: `style_category must be one of: ${VALID_CATEGORIES.join(", ")}` }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("reference_library")
    .insert({
      title,
      video_url,
      thumbnail_url: thumbnail_url ?? null,
      style_category,
      engine,
      prompt: prompt ?? null,
      tags: Array.isArray(tags) ? tags : [],
      approved_by: user.email,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fire-and-forget analysis — does not block the response
  const baseUrl = req.nextUrl.origin;
  fetch(`${baseUrl}/api/reference-library/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Forward the cookie so the analyze route can authenticate
      cookie: req.headers.get("cookie") ?? "",
    },
    body: JSON.stringify({ reference_id: data.id }),
  }).catch((err) => {
    console.error("[reference-library] auto-analyze failed to start:", err);
  });

  return NextResponse.json({ reference: data, analyzing: true }, { status: 201 });
}
