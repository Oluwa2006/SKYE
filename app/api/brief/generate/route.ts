import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

// ─── Brief Generation ─────────────────────────────────────────────────────────
//
// Claude merges two inputs:
//   1. reference.prompt (template visual DNA — style, motion, lighting, mood)
//   2. product_context (Gemini's analysis of the uploaded product images)
//
// Output: final video generation prompt + ad copy + Remotion variables.
// The user never sees or touches any of this — it is fully internal.

interface ProductContext {
  product_type:             string;
  product_name:             string;
  primary_color:            string;
  secondary_colors:         string[];
  material:                 string;
  texture:                  string;
  distinctive_features:     string;
  hero_angle:               string;
  size_and_form:            string;
  ad_visual_recommendation: string;
  category:                 string;
  target_audience:          string;
  brand_fit:                string;
}

interface ReferencePrompt {
  shot_type?:           string;
  visual_style?:        string;
  motion?:              string;
  camera_movement?:     string;
  lighting?:            string;
  lighting_description?: string;
  mood?:                string;
  color_palette?:       string[];
  grain?:               string;
  pacing?:              string;
  cut_rhythm?:          string;
  composition?:         string;
  full_prompt?:         string;
  style_category?:      string;
  example_hooks?:       string[];
  example_ctas?:        string[];
  brand_fit?:           string;
}

interface BriefOutput {
  generation_prompt: string;  // final prompt sent to video engine
  hook:              string;
  script:            string;
  cta:               string;
  remotion_vars: {
    hook_text:    string;
    cta_text:     string;
    brand_color:  string;
    color_grade:  string;    // warm | cool | neutral | contrast
    font_family:  string;
    music_track:  string;    // ambient | acoustic | upbeat | edm | lofi
    caption_text: string;
  };
}

async function generateBrief(
  referencePrompt: ReferencePrompt,
  productContext: ProductContext,
  styleCategory: string,
): Promise<BriefOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const client = new Anthropic({ apiKey });

  const styleContext = [
    referencePrompt.full_prompt && `Visual style: ${referencePrompt.full_prompt}`,
    referencePrompt.shot_type && `Shot type: ${referencePrompt.shot_type}`,
    referencePrompt.camera_movement && `Camera: ${referencePrompt.camera_movement}`,
    referencePrompt.lighting_description && `Lighting: ${referencePrompt.lighting_description}`,
    referencePrompt.mood && `Mood: ${referencePrompt.mood}`,
    referencePrompt.pacing && `Pacing: ${referencePrompt.pacing}`,
    referencePrompt.grain && referencePrompt.grain !== "none" && `Texture: ${referencePrompt.grain}`,
    referencePrompt.color_palette?.length && `Colors: ${referencePrompt.color_palette.join(", ")}`,
  ].filter(Boolean).join("\n");

  const productSummary = [
    `Product: ${productContext.product_type} (${productContext.product_name})`,
    `Color: ${productContext.primary_color}`,
    `Material/texture: ${productContext.material}, ${productContext.texture}`,
    `Distinctive features: ${productContext.distinctive_features}`,
    `Best angle: ${productContext.hero_angle}`,
    `Visual recommendation: ${productContext.ad_visual_recommendation}`,
    `Target audience: ${productContext.target_audience}`,
    `Brand fit: ${productContext.brand_fit}`,
  ].join("\n");

  const colorGradeMap: Record<string, string> = {
    cinematic: "warm",
    lifestyle: "warm",
    product: "neutral",
    energetic: "contrast",
    "text-forward": "neutral",
  };

  const musicMap: Record<string, string> = {
    cinematic: "ambient",
    lifestyle: "acoustic",
    product: "upbeat",
    energetic: "edm",
    "text-forward": "lofi",
  };

  const fontMap: Record<string, string> = {
    cinematic: "serif",
    lifestyle: "light-sans",
    product: "bold-sans",
    energetic: "heavy-sans",
    "text-forward": "mono",
  };

  const message = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 600,
    messages: [
      {
        role: "user",
        content: `You are a senior creative director at a performance marketing agency. You are building a video ad by merging a visual template style with a specific product. Your output is used directly by an AI video engine and a Remotion renderer — never seen by the user.

TEMPLATE STYLE:
${styleContext}

PRODUCT:
${productSummary}

Generate a complete ad brief. Return ONLY valid JSON — no markdown, no explanation:
{
  "generation_prompt": "A single precise video scene prompt (2-3 sentences, under 80 words) that describes exactly what the video engine should generate — camera movement, subject motion, lighting, atmosphere. Must feature the actual product naturally within the template's visual style. No text overlays, no narration in this field.",
  "hook": "scroll-stopping first line under 12 words — specific to THIS product, creates instant desire or curiosity",
  "script": "2-3 sentences — benefit-led, conversational, addresses a real pain or desire, ends with soft urgency",
  "cta": "short action CTA (e.g. 'Shop Now', 'Try It Free', 'Get Yours Today')",
  "remotion_vars": {
    "hook_text": "same as hook",
    "cta_text": "same as cta",
    "brand_color": "${productContext.primary_color.startsWith("#") ? productContext.primary_color : "#ffffff"}",
    "color_grade": "${colorGradeMap[styleCategory] ?? "neutral"}",
    "font_family": "${fontMap[styleCategory] ?? "bold-sans"}",
    "music_track": "${musicMap[styleCategory] ?? "upbeat"}",
    "caption_text": "2-4 word caption that appears under the hook — adds context or intrigue"
  }
}`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text.trim() : "{}";
  const clean = text.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
  return JSON.parse(clean) as BriefOutput;
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const admin    = createSupabaseAdmin();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { reference_id, product_context, project_id } = body as {
    reference_id: string;
    product_context: ProductContext;
    project_id?: string;
  };

  if (!reference_id) {
    return NextResponse.json({ error: "reference_id is required" }, { status: 400 });
  }
  if (!product_context) {
    return NextResponse.json({ error: "product_context is required" }, { status: 400 });
  }

  // Fetch the reference template
  const { data: ref, error: refErr } = await supabase
    .from("reference_library")
    .select("id, prompt, style_category, engine, composition_template")
    .eq("id", reference_id)
    .single();

  if (refErr || !ref) {
    return NextResponse.json({ error: "Reference not found" }, { status: 404 });
  }

  const referencePrompt = (ref.prompt as ReferencePrompt | null) ?? {};
  const styleCategory   = (ref.style_category as string) ?? "lifestyle";

  let brief: BriefOutput;
  try {
    brief = await generateBrief(referencePrompt, product_context, styleCategory);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Brief generation failed";
    console.error("[brief/generate]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // Create a base_ad from the brief so variants can be generated from it
  const { data: baseAd, error: baseAdErr } = await admin
    .from("base_ads")
    .insert({
      title:          `${product_context.product_name ?? product_context.product_type ?? "Product"} — ${styleCategory}`,
      hook:           brief.hook,
      script:         brief.script,
      cta:            brief.cta,
      ad_type:        product_context.category ?? "product",
      angle:          "desire",
      style_category: styleCategory,
      engine:         ref.engine ?? "kling",
      brand_fit:      product_context.brand_fit ?? null,
      created_by:     user.id,
      is_active:      true,
    })
    .select("id")
    .single();

  if (baseAdErr) {
    console.error("[brief/generate] failed to create base_ad:", baseAdErr.message);
    // Non-fatal — return brief without base_ad_id
  }

  // Link project to selected reference if provided
  if (project_id) {
    try {
      await admin
        .from("projects")
        .update({ selected_reference: reference_id })
        .eq("id", project_id);
    } catch { /* non-fatal */ }
  }

  return NextResponse.json({
    brief,
    base_ad_id:           baseAd?.id ?? null,
    engine:               ref.engine ?? "kling",
    style_category:       styleCategory,
    composition_template: ref.composition_template ?? styleCategory,
  });
}
