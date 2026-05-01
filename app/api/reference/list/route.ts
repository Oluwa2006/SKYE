import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

const VALID_CATEGORIES = ["cinematic", "lifestyle", "product", "text-forward", "energetic"] as const;

// ─── Template Picker — list all approved reference templates ──────────────────
// Returns templates formatted for the UI picker grid.
// Supports optional ?category= filter.

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  let query = supabase
    .from("reference_library")
    .select(
      "id, title, thumbnail_url, style_category, engine, composition_template, prompt->mood, prompt->visual_style, prompt->full_prompt, tags, date_added",
    )
    .eq("is_approved", true)
    .order("date_added", { ascending: false });

  if (category && VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number])) {
    query = query.eq("style_category", category);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ templates: data ?? [], count: (data ?? []).length });
}
