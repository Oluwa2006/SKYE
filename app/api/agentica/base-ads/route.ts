import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { canManageAgenticaLibrary, getCurrentTeamRole } from "@/lib/team-role";

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function deriveTitle(title: string, hook: string): string {
  if (title) return title;
  const derived = hook.slice(0, 64).trim();
  return derived || "Untitled Base Ad";
}

function normalizeBaseAd(row: Record<string, unknown>) {
  return {
    ...row,
    title: normalizeText(row.title) || deriveTitle("", normalizeText(row.hook)),
    ad_type: normalizeText(row.ad_type) || normalizeText(row.style_category) || "general",
    angle: normalizeText(row.angle) || normalizeText(row.hook),
  };
}

function mapAdTypeToLegacyStyle(adType: string): string {
  const value = adType.toLowerCase();
  if (value.includes("ugc") || value.includes("testimonial")) return "lifestyle";
  if (value.includes("offer") || value.includes("promo")) return "energetic";
  if (value.includes("product")) return "product";
  if (value.includes("text")) return "text-forward";
  return "lifestyle";
}

export async function GET() {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("base_ads")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ base_ads: (data ?? []).map((row) => normalizeBaseAd(row)) });
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getCurrentTeamRole(supabase, user);
  if (!canManageAgenticaLibrary(role)) {
    return NextResponse.json(
      { error: "Only admins can manage the base ad library." },
      { status: 403 },
    );
  }

  const body = await req.json();

  const hook = normalizeText(body.hook);
  const script = normalizeText(body.script);
  const cta = normalizeText(body.cta);
  const adType = normalizeText(body.ad_type) || normalizeText(body.style_category) || "general";
  const angle = normalizeText(body.angle) || hook;
  const title = deriveTitle(normalizeText(body.title), hook);
  const videoUrl = normalizeText(body.video_url) || null;
  const thumbnailUrl = normalizeText(body.thumbnail_url) || null;
  const engine = normalizeText(body.engine) || "higgsfield";
  const styleCategory = normalizeText(body.style_category) || mapAdTypeToLegacyStyle(adType);
  const tags = Array.isArray(body.tags) ? body.tags.filter((tag: unknown): tag is string => typeof tag === "string") : [];

  if (!hook || !script || !cta || !adType) {
    return NextResponse.json(
      { error: "Missing required fields: hook, script, cta, ad_type" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("base_ads")
    .insert({
      title,
      hook,
      script,
      cta,
      ad_type: adType,
      angle,
      style_category: styleCategory,
      engine,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl,
      tags,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
        hint: "If this is a new Agentica install, apply the latest Supabase migration before creating base ads.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ base_ad: normalizeBaseAd(data) }, { status: 201 });
}
