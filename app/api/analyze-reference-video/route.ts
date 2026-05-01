import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 120;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// ─── The analysis prompt ───────────────────────────────────────────────────────
const ANALYSIS_PROMPT = `
You are a world-class motion designer and direct-response ad analyst.
Watch this video advertisement frame by frame and output a complete machine-readable
schema so a developer can rebuild it exactly in Remotion (a React + CSS video framework).

RULES:
- Return ONLY valid JSON. No markdown fences. No explanation outside the JSON.
- Be exhaustive. Every element, every timing, every colour. A missed detail = a broken rebuild.
- When you cannot determine a value with confidence, use the stated default — never invent values.
- All positions and sizes are % of frame dimensions (0–100). All timings are seconds from start.
- "image_url" and "src_url" fields: ALWAYS output "" — filled by the pipeline, not you.
- Hex colours: always 6-digit lowercase e.g. "#1a2b3c". No shorthand. No rgba strings.
- null means the field is absent/not applicable. Do not omit optional fields — output null.

FRAME DIMENSIONS FOR POSITION CALIBRATION:
  9:16 → 1080 × 1920 px  |  16:9 → 1920 × 1080 px  |  1:1 → 1080 × 1080 px

FONT SIZE TABLE  (font_size_vw = observed_px ÷ frame_width × 100):
  Very large hook  ~90px on 1080w = 8.3    Large hook ~72px = 6.7
  Medium subtext   ~42px          = 3.9    Small subtext ~32px = 3.0
  CTA text         ~28px          = 2.6    Brand/label ~24px = 2.2

POSITION TABLE (% of frame):
  Top strip         y_pct  4–12   Upper-third  y_pct 15–28   Centre     y_pct 38–52
  Lower-third       y_pct 58–72   Bottom strip y_pct 78–92
  Centered 80% wide x_pct 10 width_pct 80   Left-aligned x_pct 6   Right-aligned x_pct 8–12

SPRING PRESET GUIDE (pick the closest):
  "bouncy"  — exaggerated overshoot, product slams in and wobbles back
  "soft"    — gentle settle, slight overshoot, lifestyle/elegant feel
  "snappy"  — fast and decisive, minimal bounce, premium/clean feel
  "instant" — near-immediate, no spring feel at all, hard cuts

MOTION PRESET GUIDE (pick the ONE that best describes the overall ad personality):
  "snappy_commerce"  — clean product ad, e-commerce, fast decisive feel, product scales in, text punches
  "soft_lifestyle"   — aspirational, warm, slow reveal, product fades and floats, text drifts up
  "high_energy"      — food drop, hype, loud and fast, product slams, text word-by-word
  "premium_minimal"  — luxury, SaaS, understated, product fades, text mask-wipes slowly
  "food_hype"        — restaurant, plating, close-up hero, product bounces in and floats

ENTRANCE ANIMATION GUIDE:
  Product "slam"       — scale from 0 with heavy overshoot (bouncy spring)
  Product "scale"      — scale from ~0.7 to 1.0, moderate spring
  Product "slide_up"   — translates up from below into position
  Product "slide_right"— translates in from left
  Product "fade"       — opacity 0 → 1, no movement
  Text "word_by_word"  — each word appears in sequence with stagger
  Text "char_by_char"  — each character appears in sequence
  Text "mask_wipe"     — text revealed left-to-right by a growing clip mask
  Text "scale_punch"   — text scales from large to normal (impact feel)
  Text "snap_in"       — text pops to position from slight offset, instant spring
  Text "fade_up"       — fades in while translating slightly upward

Output this exact JSON object. Fill EVERY field. Do not skip or rename any key.

{
  "ad_schema": {
    "version": "1",
    "duration_sec": <number — total video length in seconds>,
    "aspect_ratio": "<'9:16' | '16:9' | '1:1'>",

    "background": {
      "type": "<'solid' | 'gradient' | 'animated_gradient' | 'video' | 'image'>",

      "color": "<hex if type=solid, else null>",

      "gradient_colors": <["#hex1","#hex2"] if type=gradient or animated_gradient, else null>,
      "gradient_direction": "<'to_bottom'|'to_top'|'to_right'|'to_left'|'diagonal_down'|'diagonal_up' if gradient, else null>",
      "gradient_animation_duration_sec": <number if animated_gradient — how long one full colour cycle takes, else null>,

      "src_url": "",

      "video_start_sec": <number — trim: start playback at this offset. 0 if video starts from beginning, null if not video>,
      "video_speed": <number — 1=normal, 0.5=half, 2=double. null if not video>,
      "video_loop": <true|false if type=video, else null>,

      "ken_burns": <true|false if type=image and a slow pan/zoom is visible, else null>,
      "ken_burns_direction": "<'zoom_in'|'zoom_out'|'pan_right'|'pan_left' if ken_burns=true, else null>",

      "blur_px": <number — blur applied to background. 0 = sharp. null if no blur>,

      "overlay_color": "<hex — colour of any dark/light scrim overlaid on background, or null>",
      "overlay_opacity": <number 0–1 — opacity of overlay, null if no overlay>,

      "texture": "<'film_grain'|'noise'|'clean'>"
    },

    "products": [
      {
        "id": "hero",
        "x_pct": <number — left edge of product as % of frame width>,
        "y_pct": <number — top edge of product as % of frame height>,
        "width_pct": <number — product width as % of frame width>,
        "height_pct": <number — product height as % of frame height>,
        "rotation_deg": <number — clockwise tilt in degrees. 0 if upright. ±5–15 for lifestyle tilt>,

        "entrance": "<'scale'|'fade'|'slide_up'|'slide_right'|'slam'|'none'>",
        "entrance_start_sec": <number — second when product entrance animation begins>,

        "visible_animation": "<'float'|'slow_zoom_in'|'slow_zoom_out'|'parallax'|'static' — animation WHILE product is visible after entrance>",

        "exit": "<'fade_out'|'scale_down'|'none'>",
        "exit_start_sec": <number if the product disappears before the end, else null>,

        "object_fit": "<'contain' — product floats on background | 'cover' — product fills its box edge to edge>",

        "drop_shadow": "<'none'|'soft'|'medium'|'strong'|'colored'>",
        "drop_shadow_color": "<hex only when drop_shadow='colored', else null>",

        "tint_color": "<hex — colour tint overlaid on product image, null if none>",
        "tint_opacity": <number 0–1 if tint present, else null>,

        "ambient_glow": <true if a soft colored aura/halo radiates around the product, false otherwise>,
        "ambient_glow_color": "<hex — colour of the ambient glow, usually a brand accent or drop_shadow_color. null if ambient_glow=false>",
        "ambient_glow_size": <number 0.5–2.0 — relative size of glow relative to product. 0.9=90% of product area. null if ambient_glow=false>,

        "floor_reflection": <true if a mirrored faded copy of the product appears below it (surface reflection effect), false otherwise>,
        "floor_reflection_opacity": <number 0–1 if floor_reflection=true, else null>,

        "background_shape": <null if no shape behind product. Or:
        {
          "type": "<'circle'|'rounded_rect'|'rect'|'blob'>",
          "color": "<hex>",
          "opacity": <number 0–1>,
          "scale": <number — relative to product size, e.g. 1.2 = 20% larger than product>,
          "blur_px": <number if soft glow variant, else null>,
          "border_radius": <number 0–100 in % for rounded_rect, else null>
        }>,

        "z_layer": "<'behind_all_text'|'between_text'|'front'>",
        "image_url": ""
      }
      // If multiple products are visible, add an object for each with id "product_2", "product_3" etc.
      // If no product is shown, output an empty array [].
    ],

    "text_layers": [
      // Output one object per distinct text element. Common roles: hook, subtext, cta, brand, label.
      // If a text element is not present in the ad, omit it from the array (do NOT add a placeholder).
      {
        "id": "<unique snake_case id — e.g. 'hook_line_1', 'subtext', 'cta_button', 'brand_name'>",
        "role": "<'hook'|'subtext'|'cta'|'brand'|'label'|'other'>",
        "content": "<exact text string as shown in the ad, word for word>",

        "x_pct": <number — left edge as % of frame width>,
        "y_pct": <number — top edge as % of frame height>,
        "width_pct": <number — container width as % of frame width>,

        "font_family": "<closest Google Font name — e.g. 'Barlow Condensed', 'Inter', 'Montserrat', 'Playfair Display'>",
        "font_weight": <100|200|300|400|500|600|700|800|900>,
        "font_size_vw": <number — font size as % of frame width using FONT SIZE TABLE above>,
        "color": "<hex — primary text colour>",
        "gradient_fill": <null if solid colour. Or: {"colors": ["#hex1","#hex2"], "direction": "'to_bottom'|'to_right'|'diagonal'"} if the text has a gradient colour fill>,

        "text_transform": "<'uppercase'|'lowercase'|'capitalize'|'none'>",
        "letter_spacing": "<'tight'|'normal'|'wide'|'very_wide'>",
        "line_height": "<'tight'|'normal'|'loose'>",
        "text_align": "<'left'|'center'|'right'>",

        "text_shadow": <null if no shadow. Or: {"offset_x_px": number, "offset_y_px": number, "blur_px": number, "color": "hex or rgba string"}>,
        "stroke": <null if no stroke. Or: {"width_px": number, "color": "hex"}>,

        "entrance": "<'fade_up'|'fade_in'|'slide_left'|'slide_right'|'word_by_word'|'char_by_char'|'scale_punch'|'snap_in'|'mask_wipe'|'none'>",
        "entrance_start_sec": <number>,
        "stagger_ms": <number — milliseconds between each word/char for word_by_word or char_by_char. null if not staggered>,

        "exit": "<'fade_out'|'slide_out'|'none'>",
        "exit_start_sec": <number if text disappears before end, else null>,

        "loop_animation": "<'pulse'|'bounce'|'glow'|'none' — any animation that repeats while the text is visible>",

        "background": <null if no pill/card behind the text. Or:
        {
          "color": "<hex>",
          "border_radius": "<'none'|'small'|'medium'|'large'|'pill'>",
          "padding_x_vw": <number — horizontal padding as % of frame width>,
          "padding_y_vw": <number — vertical padding as % of frame width>,
          "has_shadow": <true|false>,
          "shadow_color": "<hex or null>",
          "backdrop_blur_px": <number — frosted glass blur, or null>
        }>
      }
    ],

    "decorative": [
      // Output one object per decorative element: accent lines, colour floods, rings, glows, dot patterns, sweep lines.
      // If none exist, output an empty array [].
      {
        "id": "<unique id — e.g. 'accent_line_1', 'glow_ring', 'color_flood_bottom'>",
        "type": "<'accent_line'|'color_flood'|'circle_ring'|'glow'|'dot_pattern'|'sweep_line'|'shape'>",

        "fill": <{"type": "solid", "color": "#hex"} or {"type": "gradient", "colors": ["#hex1","#hex2"], "direction": "'to_bottom'|'to_right'|'diagonal'"}>,
        "opacity": <number 0–1>,

        "x_pct": <number — left edge as % of frame width>,
        "y_pct": <number — top edge as % of frame height>,
        "width_pct": <number>,
        "height_pct": <number>,

        "border_radius": "<'none'|'small'|'medium'|'large'|'full' or null>",

        "stroke_only": <true if this is an outline/ring with no fill, false if filled>,
        "stroke_width": <number in px if stroke_only=true, else null>,

        "rotation_deg": <number — for diagonal sweep lines or tilted shapes. 0 if axis-aligned, null if irrelevant>,
        "blur_px": <number — for glow elements. null if sharp>,

        "entrance": "<'grow_width'|'grow_height'|'scale'|'fade'|'sweep'|'none'>",
        "entrance_start_sec": <number>,
        "entrance_duration_sec": <number — how long the entrance animation takes>,

        "exit": "<'fade_out'|'none'>",
        "exit_start_sec": <number if element disappears before end, else null>
      }
    ],

    "logo": <null if no visible brand logo image. Or:
    {
      "image_url": "",
      "x_pct": <number>,
      "y_pct": <number>,
      "width_pct": <number>,
      "height_pct": <number>,
      "entrance": "<'fade_in'|'slide_in'|'scale_in'|'none'>",
      "entrance_start_sec": <number>,
      "exit": "<'fade_out'|'none'>",
      "exit_start_sec": <number or null>,
      "opacity": <number 0–1>
    }>,

    "audio": {
      "has_music": <true|false>,
      "music_energy": "<'calm'|'upbeat'|'intense'|'emotional'|'none'>",
      "has_voiceover": <true|false>,
      "has_sound_effects": <true|false>,
      "beat_moments_sec": [<list of seconds where a beat or sound cue clearly drives a visual change — e.g. a cut, a text pop, a product slam. Empty array [] if none obvious>]
    },

    "motion": {
      "spring_preset": "<'bouncy'|'soft'|'snappy'|'instant' — the ONE preset that best describes the dominant motion feel of this ad. Use SPRING PRESET GUIDE above>",
      "overall_pacing": "<'slow_build'|'medium'|'fast_punch'|'whiplash'>",
      "motion_preset": "<'snappy_commerce'|'soft_lifestyle'|'high_energy'|'premium_minimal'|'food_hype' — pick the ONE that best describes the overall ad personality. Use MOTION PRESET GUIDE above>",
      "cut_timestamps_sec": [<list of seconds where a hard cut occurs — scene jumps with no transition. Empty array [] if no hard cuts>],
      "layer_spring_overrides": {
        "<layer_id>": "<spring_preset>"
        // Only include layers whose spring feel is noticeably different from the global preset.
        // E.g. if the global is "soft" but the product entrance is a hard slam: {"hero": "bouncy"}
        // If no overrides, output an empty object {}
      }
    }
  },

  "hero_product": {
    "best_frame_seconds": <number — the timestamp in seconds where the hero product is most clearly visible, in isolation, without motion blur. Pick the single clearest frame>,
    "description": "<brief visual description of the product at that frame — e.g. 'dark red sneaker, 3/4 angle, clean white background'>"
  },

  "remotion_compatibility": {
    "verdict": "<'renderable'|'approximable'|'not_recommended'>",

    "blocking_effects": [
      {
        "effect": "<'motion_blur'|'3d_rotation'|'particles'|'compositing_transition'|'liquid_morph'|'lens_flare'|'physics_sim'|'procedural_noise'|'other'>",
        "element": "<which element — e.g. 'hero product', 'headline text', 'background video pan'>",
        "timestamp_seconds": <number>,
        "reason": "<precise description of what you see and exactly why CSS/React/Remotion cannot replicate it>"
      }
    ],

    "approximable_effects": [
      {
        "effect": "<'custom_font'|'text_on_path'|'outlined_text'|'color_grading'|'film_grain'|'halftone'|'glitch'|'beat_sync'|'shadow_precision'|'blend_mode'|'bokeh'|'custom_easing'|'video_grade'|'other'>",
        "element": "<which element — e.g. 'headline font', 'background behind product', 'scene transition at 4.1s'>",
        "reason": "<precise description of what you see and exactly what will look different in the Remotion rebuild>"
      }
    ],

    "minor_differences": [
      {
        "detail": "<one sentence — what will be slightly off and why it does not matter much>"
      }
    ],

    "font_risk": "<'low'|'medium'|'high'>",
    "font_notes": "<name every font face visible in the ad, describe weight + style, and give the closest Google Fonts equivalent — e.g. 'Headline: heavy condensed sans, closest match Barlow Condensed ExtraBold 800. Subtext: regular humanist sans, closest match Inter Regular 400.'>"
  }
}

VERDICT RULES (set AFTER filling the arrays above):
  "renderable"      — blocking_effects is empty. Everything matches or is in approximable/minor.
  "approximable"    — blocking_effects is empty but approximable_effects has items.
  "not_recommended" — one or more items in blocking_effects.

BLOCKING categories to check frame by frame:
  Motion blur on ANY element (product sliding in, text entrance, camera shake, even subtle blur).
  True 3D rotation (all three axes), perspective distortion CSS cannot fake, depth-of-field bokeh changing with motion.
  Particles: confetti, sparks, smoke, dust, bubbles — any system of many small individually-moving elements.
  Compositing transitions: luma/alpha mattes, displacement maps, warp/morph between scenes, cross-dissolve with per-pixel blending.
  Liquid/organic morphs: shapes smoothly transitioning between blob-like forms.
  Optical effects: lens flares, anamorphic streaks, film burn/light leak baked into the shot motion.
  Physics simulations: cloth, fluid, rigid-body collisions.
  Per-frame procedural noise that evolves non-repeatably every frame.

APPROXIMABLE categories to check:
  Custom/licensed fonts not available on Google Fonts. Text on curved path. Variable font weight morphing.
  Text inner shadow (CSS text-shadow is outer only). Outlined text with specific stroke width.
  Color grading LUT, duotone, vignette, heavy saturation boost, desaturated-except-one-color effects.
  Film grain, halftone, noise pattern, paper texture (SVG feTurbulence approximates but won't match).
  Glitch/RGB split/VHS lines/pixel offset.
  Beat-synced cuts or animations (note EVERY moment clearly synced to audio).
  Drop shadows or glows with very specific spread/offset/colour that define the visual identity.
  Blend modes (multiply, screen, overlay) — CSS mix-blend-mode renders differently per browser.
  Background that blurs/sharpens (bokeh pull-focus).

A missed detail in either section = the admin is surprised. Be exhaustive.
`;

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  const formData  = await req.formData();
  const file      = formData.get("file") as File | null;
  const videoUrl  = formData.get("video_url") as string | null;

  // ── Accept either a file upload or a direct URL ───────────────────────────
  let mimeType: string;
  let videoData:  Buffer | null  = null;
  let inlineData: string | null = null;

  if (file) {
    // Direct file upload (must be under 20MB for inline Gemini)
    const MAX_BYTES = 20 * 1024 * 1024;
    const buffer   = Buffer.from(await file.arrayBuffer());

    if (buffer.byteLength > MAX_BYTES) {
      return NextResponse.json(
        { error: `Video is ${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB. Maximum for inline analysis is 20MB. Trim it under 20MB or export a shorter clip.` },
        { status: 413 },
      );
    }

    mimeType   = file.type || "video/mp4";
    videoData  = buffer;
    inlineData = buffer.toString("base64");

  } else if (videoUrl) {
    // Download from URL
    const res = await fetch(videoUrl);
    if (!res.ok) return NextResponse.json({ error: "Could not fetch video from URL" }, { status: 400 });

    const buffer  = Buffer.from(await res.arrayBuffer());
    const MAX_BYTES = 20 * 1024 * 1024;

    if (buffer.byteLength > MAX_BYTES) {
      return NextResponse.json(
        { error: `Video is ${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB. Maximum is 20MB.` },
        { status: 413 },
      );
    }

    mimeType   = res.headers.get("content-type") || "video/mp4";
    videoData  = buffer;
    inlineData = buffer.toString("base64");

  } else {
    return NextResponse.json({ error: "Provide either a 'file' upload or a 'video_url'" }, { status: 400 });
  }

  // Suppress unused warning
  void videoData;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: inlineData!,
        },
      },
      { text: ANALYSIS_PROMPT },
    ]);

    const raw = result.response.text().trim();

    // Strip markdown fences if Gemini wraps it anyway
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Gemini returned non-JSON output", raw }, { status: 500 });
    }

    // New prompt shape: { ad_schema, hero_product, remotion_compatibility }
    // Legacy shape: { overview, background, ... } — pass through as-is for backwards compat
    const isNewShape = "ad_schema" in parsed;

    return NextResponse.json({
      analysis: parsed,
      // Convenience top-level keys so the dashboard can read them without drilling in
      ad_schema:              isNewShape ? parsed.ad_schema              : null,
      hero_product:           isNewShape ? parsed.hero_product           : null,
      remotion_compatibility: isNewShape ? parsed.remotion_compatibility : (parsed.remotion_compatibility ?? null),
      raw_text: cleaned,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Gemini analysis failed";
    console.error("[analyze-reference-video]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
