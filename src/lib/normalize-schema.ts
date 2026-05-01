// ─── Step 4 — Schema normalizer ───────────────────────────────────────────────
// Clamps, validates and fills defaults on raw Gemini output before render.
// Returns a guaranteed-safe AdSchema — never throws.

import type {
  AdSchema, BackgroundLayer, ProductLayer, TextLayer, DecorativeLayer,
  LogoLayer, SpringPreset, ProductEntrance, TextEntrance, DecorativeEntrance,
  DropShadow, ProductVisibleAnimation, LetterSpacing, LineHeight, FontWeight,
  MotionPresetName,
} from "./ad-schema";
import { correctSchema } from "./correct-schema";
import { applyMotionPreset } from "./motion-presets";

// ── Primitives ─────────────────────────────────────────────────────────────────
const clamp  = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const pct    = (v: unknown, def = 0)     => typeof v === "number" ? clamp(v, 0, 100)  : def;
const op     = (v: unknown, def = 1)     => typeof v === "number" ? clamp(v, 0, 1)    : def;
const pos    = (v: unknown, def = 0)     => typeof v === "number" && isFinite(v) ? v  : def;
const hex    = (v: unknown, def = "#000000") =>
  typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : def;
function pick<T>(v: unknown, options: readonly T[], def: T): T {
  return options.includes(v as T) ? (v as T) : def;
}

// ── Background ─────────────────────────────────────────────────────────────────
function normBg(raw: unknown): BackgroundLayer {
  const r = (raw ?? {}) as Record<string, unknown>;
  const type = pick(r.type, ["solid","gradient","animated_gradient","video","image"] as const, "solid");
  return {
    type,
    color:               type === "solid"    ? hex(r.color, "#000000")    : undefined,
    gradient_colors:     (type === "gradient" || type === "animated_gradient")
                          ? [hex((r.gradient_colors as unknown[])?.[0], "#000000"),
                             hex((r.gradient_colors as unknown[])?.[1], "#ffffff")]
                          : undefined,
    gradient_direction:  pick(r.gradient_direction,
                           ["to_bottom","to_top","to_right","to_left","diagonal_down","diagonal_up"] as const,
                           "to_bottom"),
    gradient_animation_duration_sec: type === "animated_gradient"
                          ? pos(r.gradient_animation_duration_sec, 4) : undefined,
    src_url:             type === "video" || type === "image" ? "" : undefined,
    video_start_sec:     type === "video" ? pos(r.video_start_sec, 0)  : undefined,
    video_speed:         type === "video" ? pos(r.video_speed,     1)  : undefined,
    video_loop:          type === "video" ? Boolean(r.video_loop ?? true) : undefined,
    ken_burns:           type === "image" ? Boolean(r.ken_burns)       : undefined,
    ken_burns_direction: type === "image"
                          ? pick(r.ken_burns_direction, ["zoom_in","zoom_out","pan_right","pan_left"] as const, "zoom_in")
                          : undefined,
    blur_px:             typeof r.blur_px === "number" ? clamp(r.blur_px, 0, 80)  : undefined,
    overlay_color:       r.overlay_color  ? hex(r.overlay_color,  undefined as unknown as string) : undefined,
    overlay_opacity:     r.overlay_opacity != null ? op(r.overlay_opacity) : undefined,
    texture:             pick(r.texture, ["film_grain","noise","clean"] as const, "clean"),
  };
}

// ── Product ────────────────────────────────────────────────────────────────────
const PRODUCT_ENTRANCES: ProductEntrance[] = ["scale","fade","slide_up","slide_right","slam","none"];
const PRODUCT_VISIBLE:   ProductVisibleAnimation[] = ["float","slow_zoom_in","slow_zoom_out","parallax","static"];
const DROP_SHADOWS:      DropShadow[] = ["none","soft","medium","strong","colored"];

function normProduct(raw: unknown, idx: number): ProductLayer {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    id:               typeof r.id === "string" ? r.id : idx === 0 ? "hero" : `product_${idx + 1}`,
    x_pct:            pct(r.x_pct, 10),
    y_pct:            pct(r.y_pct, 10),
    width_pct:        pct(r.width_pct, 80),
    height_pct:       pct(r.height_pct, 55),
    rotation_deg:     typeof r.rotation_deg === "number" ? clamp(r.rotation_deg, -45, 45) : 0,
    entrance:         pick(r.entrance, PRODUCT_ENTRANCES, "scale"),
    entrance_start_sec: pos(r.entrance_start_sec, 0),
    visible_animation:pick(r.visible_animation, PRODUCT_VISIBLE, "static"),
    exit:             pick(r.exit, ["fade_out","scale_down","none"] as const, "none"),
    exit_start_sec:   typeof r.exit_start_sec === "number" ? r.exit_start_sec : null,
    object_fit:       pick(r.object_fit, ["contain","cover"] as const, "contain"),
    drop_shadow:      pick(r.drop_shadow, DROP_SHADOWS, "medium"),
    drop_shadow_color:r.drop_shadow === "colored" ? hex(r.drop_shadow_color, "#000000") : undefined,
    tint_color:       r.tint_color  ? hex(r.tint_color, undefined as unknown as string) : undefined,
    tint_opacity:     r.tint_opacity != null ? op(r.tint_opacity) : undefined,
    ambient_glow:       r.ambient_glow != null ? Boolean(r.ambient_glow) : undefined,
    ambient_glow_color: r.ambient_glow_color ? hex(r.ambient_glow_color, undefined as unknown as string) : undefined,
    ambient_glow_size:  typeof r.ambient_glow_size === "number" ? clamp(r.ambient_glow_size, 0.1, 3) : undefined,
    floor_reflection:         r.floor_reflection != null ? Boolean(r.floor_reflection) : undefined,
    floor_reflection_opacity: typeof r.floor_reflection_opacity === "number" ? op(r.floor_reflection_opacity) : undefined,
    background_shape: r.background_shape ? normBgShape(r.background_shape) : undefined,
    z_layer:          pick(r.z_layer, ["behind_all_text","between_text","front"] as const, "behind_all_text"),
    image_url:        "",
  };
}

function normBgShape(raw: unknown) {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    type:          pick(r.type, ["circle","rounded_rect","rect","blob"] as const, "circle"),
    color:         hex(r.color, "#ffffff"),
    opacity:       op(r.opacity, 0.15),
    scale:         typeof r.scale === "number" ? clamp(r.scale, 0.5, 3) : 1.2,
    blur_px:       typeof r.blur_px === "number" ? clamp(r.blur_px, 0, 80) : undefined,
    border_radius: typeof r.border_radius === "number" ? clamp(r.border_radius, 0, 100) : undefined,
  };
}

// ── Text ───────────────────────────────────────────────────────────────────────
const TEXT_ENTRANCES: TextEntrance[] = ["fade_up","fade_in","slide_left","slide_right","word_by_word","char_by_char","scale_punch","snap_in","mask_wipe","line_reveal","blur_in","rise","none"];
const FONT_WEIGHTS: FontWeight[] = [100,200,300,400,500,600,700,800,900];
const LETTER_SPACINGS: LetterSpacing[] = ["tight","normal","wide","very_wide"];
const LINE_HEIGHTS: LineHeight[] = ["tight","normal","loose"];

function normText(raw: unknown, idx: number): TextLayer {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    id:               typeof r.id === "string" ? r.id : `text_${idx}`,
    role:             pick(r.role, ["hook","subtext","cta","brand","label","other"] as const, "other"),
    content:          typeof r.content === "string" ? r.content : "",
    x_pct:            pct(r.x_pct, 10),
    y_pct:            pct(r.y_pct, 40),
    width_pct:        pct(r.width_pct, 80),
    font_family:      typeof r.font_family === "string" ? r.font_family : "Inter",
    font_weight:      pick(r.font_weight, FONT_WEIGHTS, 700),
    font_size_vw:     typeof r.font_size_vw === "number" ? clamp(r.font_size_vw, 0.5, 20) : 5,
    color:            hex(r.color, "#ffffff"),
    gradient_fill:    r.gradient_fill ? normGradientFill(r.gradient_fill) : undefined,
    text_transform:   pick(r.text_transform, ["uppercase","lowercase","capitalize","none"] as const, "none"),
    letter_spacing:   pick(r.letter_spacing, LETTER_SPACINGS, "normal"),
    line_height:      pick(r.line_height, LINE_HEIGHTS, "normal"),
    text_align:       pick(r.text_align, ["left","center","right"] as const, "center"),
    text_shadow:      r.text_shadow ? normTextShadow(r.text_shadow) : undefined,
    stroke:           r.stroke ? normStroke(r.stroke) : undefined,
    entrance:         pick(r.entrance, TEXT_ENTRANCES, "fade_up"),
    entrance_start_sec: pos(r.entrance_start_sec, 0),
    stagger_ms:       typeof r.stagger_ms === "number" ? clamp(r.stagger_ms, 0, 500) : null,
    exit:             pick(r.exit, ["fade_out","slide_out","none"] as const, "none"),
    exit_start_sec:   typeof r.exit_start_sec === "number" ? r.exit_start_sec : null,
    loop_animation:   pick(r.loop_animation, ["pulse","bounce","glow","none"] as const, "none"),
    background:       r.background ? normTextBg(r.background) : undefined,
  };
}

function normGradientFill(raw: unknown) {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    colors: [
      hex((r.colors as unknown[])?.[0], "#ffffff"),
      hex((r.colors as unknown[])?.[1], "#cccccc"),
    ] as [string, string],
    direction: pick(r.direction, ["to_bottom","to_right","diagonal"] as const, "to_bottom"),
  };
}

function normTextShadow(raw: unknown) {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    offset_x_px: typeof r.offset_x_px === "number" ? r.offset_x_px : 0,
    offset_y_px: typeof r.offset_y_px === "number" ? r.offset_y_px : 4,
    blur_px:     typeof r.blur_px     === "number" ? clamp(r.blur_px, 0, 80) : 12,
    color:       typeof r.color       === "string" ? r.color : "rgba(0,0,0,0.5)",
  };
}

function normStroke(raw: unknown) {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    width_px: typeof r.width_px === "number" ? clamp(r.width_px, 0.5, 20) : 2,
    color:    hex(r.color, "#000000"),
  };
}

function normTextBg(raw: unknown) {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    color:          hex(r.color, "#000000"),
    border_radius:  pick(r.border_radius, ["none","small","medium","large","pill"] as const, "medium"),
    padding_x_vw:   typeof r.padding_x_vw === "number" ? clamp(r.padding_x_vw, 0, 20) : 2,
    padding_y_vw:   typeof r.padding_y_vw === "number" ? clamp(r.padding_y_vw, 0, 20) : 1,
    has_shadow:     Boolean(r.has_shadow),
    shadow_color:   r.shadow_color ? hex(r.shadow_color, undefined as unknown as string) : undefined,
    backdrop_blur_px: typeof r.backdrop_blur_px === "number" ? clamp(r.backdrop_blur_px, 0, 40) : undefined,
  };
}

// ── Decorative ─────────────────────────────────────────────────────────────────
const DEC_ENTRANCES: DecorativeEntrance[] = ["grow_width","grow_height","scale","fade","sweep","none"];

function normDecorative(raw: unknown, idx: number): DecorativeLayer {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    id:               typeof r.id === "string" ? r.id : `dec_${idx}`,
    type:             pick(r.type, ["accent_line","color_flood","circle_ring","glow","dot_pattern","sweep_line","shape"] as const, "accent_line"),
    fill:             normDecFill(r.fill),
    opacity:          op(r.opacity, 1),
    x_pct:            pct(r.x_pct, 0),
    y_pct:            pct(r.y_pct, 0),
    width_pct:        pct(r.width_pct, 100),
    height_pct:       pct(r.height_pct, 1),
    border_radius:    pick(r.border_radius, ["none","small","medium","large","full"] as const, "none"),
    stroke_only:      Boolean(r.stroke_only),
    stroke_width:     typeof r.stroke_width === "number" ? clamp(r.stroke_width, 0.5, 20) : undefined,
    rotation_deg:     typeof r.rotation_deg === "number" ? r.rotation_deg : 0,
    blur_px:          typeof r.blur_px === "number" ? clamp(r.blur_px, 0, 80) : undefined,
    entrance:         pick(r.entrance, DEC_ENTRANCES, "fade"),
    entrance_start_sec: pos(r.entrance_start_sec, 0),
    entrance_duration_sec: pos(r.entrance_duration_sec, 0.5),
    exit:             pick(r.exit, ["fade_out","none"] as const, "none"),
    exit_start_sec:   typeof r.exit_start_sec === "number" ? r.exit_start_sec : null,
  };
}

function normDecFill(raw: unknown) {
  const r = (raw ?? {}) as Record<string, unknown>;
  if (r.type === "gradient") {
    return {
      type: "gradient" as const,
      colors: [
        hex((r.colors as unknown[])?.[0], "#ffffff"),
        hex((r.colors as unknown[])?.[1], "#000000"),
      ] as [string, string],
      direction: pick(r.direction, ["to_bottom","to_right","diagonal"] as const, "to_bottom"),
    };
  }
  return { type: "solid" as const, color: hex(r.color, "#ffffff") };
}

// ── Logo ───────────────────────────────────────────────────────────────────────
function normLogo(raw: unknown): LogoLayer {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    image_url:        "",
    x_pct:            pct(r.x_pct, 5),
    y_pct:            pct(r.y_pct, 5),
    width_pct:        pct(r.width_pct, 20),
    height_pct:       pct(r.height_pct, 8),
    entrance:         pick(r.entrance, ["fade_in","slide_in","scale_in","none"] as const, "fade_in"),
    entrance_start_sec: pos(r.entrance_start_sec, 0),
    exit:             pick(r.exit, ["fade_out","none"] as const, "none"),
    exit_start_sec:   typeof r.exit_start_sec === "number" ? r.exit_start_sec : null,
    opacity:          op(r.opacity, 1),
  };
}

// ── Root ───────────────────────────────────────────────────────────────────────
export function normalizeSchema(raw: unknown): AdSchema {
  const r = (raw ?? {}) as Record<string, unknown>;
  const duration = pos(r.duration_sec, 15);

  const products     = Array.isArray(r.products)     ? r.products.map(normProduct)     : [];
  const text_layers  = Array.isArray(r.text_layers)  ? r.text_layers.map(normText)     : [];
  const decorative   = Array.isArray(r.decorative)   ? r.decorative.map(normDecorative) : [];

  const SPRING_OPTIONS: SpringPreset[] = ["bouncy","soft","snappy","instant"];
  const PRESET_OPTIONS: MotionPresetName[] = ["snappy_commerce","soft_lifestyle","high_energy","premium_minimal","food_hype"];

  const rawMotion = (r.motion as Record<string,unknown>) ?? {};
  const motionPreset = pick(rawMotion.motion_preset, PRESET_OPTIONS, undefined as unknown as MotionPresetName) || undefined;

  const base: AdSchema = {
    version:      "1",
    duration_sec: clamp(duration, 1, 120),
    aspect_ratio: pick(r.aspect_ratio, ["9:16","16:9","1:1"] as const, "9:16"),
    background:   normBg(r.background),
    products,
    text_layers,
    decorative,
    logo:         r.logo ? normLogo(r.logo) : undefined,
    audio: {
      has_music:          Boolean((r.audio as Record<string,unknown>)?.has_music),
      music_energy:       pick((r.audio as Record<string,unknown>)?.music_energy, ["calm","upbeat","intense","emotional","none"] as const, "none"),
      has_voiceover:      Boolean((r.audio as Record<string,unknown>)?.has_voiceover),
      has_sound_effects:  Boolean((r.audio as Record<string,unknown>)?.has_sound_effects),
      beat_moments_sec:   Array.isArray((r.audio as Record<string,unknown>)?.beat_moments_sec)
                            ? ((r.audio as Record<string,unknown>).beat_moments_sec as number[]).filter(n => typeof n === "number")
                            : [],
    },
    motion: {
      spring_preset:       pick(rawMotion.spring_preset, SPRING_OPTIONS, "soft"),
      overall_pacing:      pick(rawMotion.overall_pacing, ["slow_build","medium","fast_punch","whiplash"] as const, "medium"),
      motion_preset:       motionPreset,
      cut_timestamps_sec:  Array.isArray(rawMotion.cut_timestamps_sec)
                            ? (rawMotion.cut_timestamps_sec as number[]).filter(n => typeof n === "number")
                            : [],
      layer_spring_overrides: (() => {
        const ov = rawMotion.layer_spring_overrides;
        if (!ov || typeof ov !== "object") return {};
        const out: Record<string, SpringPreset> = {};
        for (const [k, v] of Object.entries(ov as Record<string,unknown>)) {
          if (SPRING_OPTIONS.includes(v as SpringPreset)) out[k] = v as SpringPreset;
        }
        return out;
      })(),
    },
  };

  // Pass 2 — structural corrections
  const corrected = correctSchema(base);

  // Pass 3 — apply motion preset (overrides individual layer animations)
  if (motionPreset) return applyMotionPreset(corrected, motionPreset);
  return corrected;
}
