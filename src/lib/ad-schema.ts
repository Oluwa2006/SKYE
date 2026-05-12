// ─── AdSchema v1 ──────────────────────────────────────────────────────────────
// The universal ad description format.
// Gemini outputs it. AdMeta.tsx consumes it. ad_templates stores it.
// Every position and size is expressed as % of frame dimensions so the schema
// is resolution-independent (works for 9:16, 16:9, 1:1).
// The version field is mandatory — bump it when the shape changes so old
// stored templates can be migrated rather than silently breaking.

export type AdSchemaVersion = "1";

// ─── Motion ───────────────────────────────────────────────────────────────────

export type SpringPreset =
  | "bouncy"   // damping  8,  stiffness 280 — slams in, wobbles back hard
  | "crispy"   // damping 14,  stiffness 380 — fast arrival, sharp snap, slight overshoot
  | "soft"     // damping 18,  stiffness 160 — gentle settle, lifestyle feel
  | "snappy"   // damping 22,  stiffness 260 — decisive, minimal bounce
  | "instant"; // damping 100, stiffness 500 — near-immediate, no spring

export type MotionPresetName =
  | "snappy_commerce"
  | "soft_lifestyle"
  | "high_energy"
  | "premium_minimal"
  | "food_hype";

export type MotionConfig = {
  spring_preset:  SpringPreset;
  overall_pacing: "slow_build" | "medium" | "fast_punch" | "whiplash";
  // Curated animation personality — overrides individual layer values when applied
  motion_preset?: MotionPresetName;
  // Hard cut timestamps — frame jumps with no transition at these seconds
  cut_timestamps_sec: number[];
  // Per-layer spring overrides — keyed by layer id (product, or any text/decorative id)
  // If a layer id is present here it ignores the global spring_preset
  layer_spring_overrides: Record<string, SpringPreset>;
};

// ─── Background ───────────────────────────────────────────────────────────────

export type BackgroundLayer = {
  type: "solid" | "gradient" | "animated_gradient" | "video" | "image";

  // solid
  color?: string; // hex

  // gradient + animated_gradient
  gradient_colors?:    [string, string];
  gradient_direction?: "to_bottom" | "to_top" | "to_right" | "to_left" | "diagonal_down" | "diagonal_up";
  // animated_gradient only — how long one full color cycle takes
  gradient_animation_duration_sec?: number;

  // video or image
  src_url?: string;

  // video only
  video_start_sec?:   number;  // trim — start playback at this offset
  video_speed?:       number;  // 1 = normal, 0.5 = half speed, 2 = double
  video_loop?:        boolean;

  // image only — slow pan/zoom while visible
  ken_burns?:           boolean;
  ken_burns_direction?: "zoom_in" | "zoom_out" | "pan_right" | "pan_left";

  // blur applied to the background (0 = sharp)
  blur_px?: number;

  // overlay on top of any background type
  overlay_color?:   string; // hex
  overlay_opacity?: number; // 0–1

  texture?: "film_grain" | "noise" | "clean";
};

// ─── Product ──────────────────────────────────────────────────────────────────

export type ProductEntrance =
  | "scale"
  | "fade"
  | "slide_up"
  | "slide_right"
  | "slam"
  | "none";

export type ProductVisibleAnimation =
  | "float"
  | "slow_zoom_in"
  | "slow_zoom_out"
  | "parallax"
  | "static";

export type DropShadow =
  | "none"
  | "soft"
  | "medium"
  | "strong"
  | "colored"; // uses drop_shadow_color

// Shape placed directly behind the product image —
// common in product ads (circle halo, rounded rect platform, etc.)
export type ProductBackgroundShape = {
  type:          "circle" | "rounded_rect" | "rect" | "blob";
  color:         string;  // hex
  opacity:       number;  // 0–1
  scale:         number;  // relative to product size — e.g. 1.2 = 20% larger than product
  blur_px?:      number;  // soft glow variant
  border_radius?: number; // % — for rounded_rect
};

export type ProductLayer = {
  id: string; // unique — e.g. "hero", "product_2", "product_3"

  // position as % of frame
  x_pct:      number;
  y_pct:      number;
  width_pct:  number;
  height_pct: number;

  // slight tilt — positive = clockwise, negative = counter-clockwise
  rotation_deg: number; // usually 0, sometimes ±5–15 for lifestyle ads

  entrance:           ProductEntrance;
  entrance_start_sec: number;

  visible_animation:  ProductVisibleAnimation;

  exit:           "fade_out" | "scale_down" | "none";
  exit_start_sec: number | null;

  object_fit:         "contain" | "cover";
  drop_shadow:        DropShadow;
  drop_shadow_color?: string; // hex — only when drop_shadow === "colored"

  // optional color tint overlaid on the product image
  tint_color?:   string; // hex
  tint_opacity?: number; // 0–1

  // soft colored aura radiating behind the product
  ambient_glow?:       boolean;
  ambient_glow_color?: string;  // defaults to drop_shadow_color or accent
  ambient_glow_size?:  number;  // 0–1, relative to product size (default 0.9)

  // mirrored faded copy below the product (product-on-surface effect)
  floor_reflection?:         boolean;
  floor_reflection_opacity?: number; // 0–1, default 0.25

  // shape rendered behind the product (z-order: background → shape → product)
  background_shape?: ProductBackgroundShape;

  z_layer: "behind_all_text" | "between_text" | "front";

  // What kind of asset this slot expects from the consumer.
  // "product"   — physical product photo (bottle, shoe, food, device, etc.)
  // "logo"      — brand mark, icon, wordmark, app icon — 2D flat graphic
  // "lifestyle" — person, scene, context shot — not the product itself
  slot_type?: "product" | "logo" | "lifestyle";

  // populated by the consumer at render time
  image_url: string;
};

// ─── Text ─────────────────────────────────────────────────────────────────────

export type TextEntrance =
  | "fade_up"
  | "fade_in"
  | "slide_left"
  | "slide_right"
  | "word_by_word"
  | "char_by_char"
  | "scale_punch"
  | "snap_in"
  | "mask_wipe"    // text revealed by a growing clip-path mask (left → right)
  | "line_reveal"  // text rises up from behind an overflow clip — premium motion design standard
  | "blur_in"      // starts blurred and sharpens into focus — cinematic/beauty feel
  | "rise"         // slow cinematic translateY, softer than fade_up — lifestyle/luxury
  | "none";

export type TextExit    = "fade_out" | "slide_out" | "none";
export type LetterSpacing = "tight" | "normal" | "wide" | "very_wide";
export type LineHeight    = "tight" | "normal" | "loose";
export type FontWeight    = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

export type TextShadow = {
  offset_x_px: number;
  offset_y_px: number;
  blur_px:     number;
  color:       string; // hex or rgba string
};

export type TextStroke = {
  width_px: number;
  color:    string; // hex
};

export type TextBackground = {
  color:          string;
  border_radius:  "none" | "small" | "medium" | "large" | "pill";
  padding_x_vw:   number; // % of frame width
  padding_y_vw:   number;
  has_shadow:     boolean;
  shadow_color?:  string;
  // frosted glass — blurs content behind the text block
  backdrop_blur_px?: number;
};

export type TextLayer = {
  id:   string;
  role: "hook" | "subtext" | "cta" | "brand" | "label" | "other";

  content: string;

  x_pct:     number;
  y_pct:     number;
  width_pct: number;

  font_family:    string;
  font_weight:    FontWeight;
  font_size_vw:   number;    // % of frame width
  color:          string;    // hex — for solid fill
  // gradient fill — if present, overrides color
  gradient_fill?: {
    colors:    [string, string];
    direction: "to_bottom" | "to_right" | "diagonal";
  };
  text_transform: "uppercase" | "lowercase" | "capitalize" | "none";
  letter_spacing: LetterSpacing;
  line_height:    LineHeight;
  text_align:     "left" | "center" | "right";

  text_shadow?: TextShadow; // undefined = no shadow
  stroke?:      TextStroke; // undefined = no stroke

  entrance:           TextEntrance;
  entrance_start_sec: number;
  stagger_ms:         number | null;

  exit:           TextExit;
  exit_start_sec: number | null;

  loop_animation: "pulse" | "bounce" | "glow" | "none";

  background?: TextBackground;
};

// ─── Logo ─────────────────────────────────────────────────────────────────────
// Brand logo image — separate from text brand name.
// Some ads show an actual logo lockup (SVG, PNG with transparency).

export type LogoLayer = {
  image_url: string; // set by admin at template creation time

  x_pct:      number;
  y_pct:      number;
  width_pct:  number;
  height_pct: number;

  entrance:           "fade_in" | "slide_in" | "scale_in" | "none";
  entrance_start_sec: number;

  exit:           "fade_out" | "none";
  exit_start_sec: number | null;

  opacity: number; // 0–1 — some logos are semi-transparent
};

// ─── Decorative ───────────────────────────────────────────────────────────────

export type DecorativeType =
  | "accent_line"
  | "color_flood"
  | "circle_ring"
  | "glow"
  | "dot_pattern"
  | "sweep_line"  // diagonal line that crosses the frame — common transition element
  | "shape";

export type DecorativeEntrance =
  | "grow_width"
  | "grow_height"
  | "scale"
  | "fade"
  | "sweep"  // translates across the frame in one direction
  | "none";

export type DecorativeFill =
  | { type: "solid"; color: string }
  | { type: "gradient"; colors: [string, string]; direction: "to_bottom" | "to_right" | "diagonal" };

export type DecorativeLayer = {
  id: string;

  type:    DecorativeType;
  fill:    DecorativeFill;
  opacity: number; // 0–1

  x_pct:      number;
  y_pct:      number;
  width_pct:  number;
  height_pct: number;

  border_radius?: "none" | "small" | "medium" | "large" | "full";

  // stroke-only mode (e.g. outline ring, outline rectangle)
  stroke_only?:  boolean;
  stroke_width?: number; // px

  // rotation for diagonal elements
  rotation_deg?: number;

  // blur for glow elements
  blur_px?: number;

  entrance:              DecorativeEntrance;
  entrance_start_sec:    number;
  entrance_duration_sec: number;

  exit:           "fade_out" | "none";
  exit_start_sec: number | null;
};

// ─── Audio ────────────────────────────────────────────────────────────────────
// Informational only — Remotion does not analyse audio.
// Stored so AdMeta can optionally use beat_moments_sec for cut timing.

export type AudioConfig = {
  has_music:        boolean;
  music_energy:     "calm" | "upbeat" | "intense" | "emotional" | "none";
  has_voiceover:    boolean;
  has_sound_effects:boolean;
  // Timestamps where a beat or sound cue clearly drives a visual change.
  // Used as hints for hard cut timing in AdMeta.
  beat_moments_sec: number[];
};

// ─── Root schema ──────────────────────────────────────────────────────────────

export type AdSchema = {
  version:      AdSchemaVersion;
  duration_sec: number;
  aspect_ratio: "9:16" | "16:9" | "1:1";

  background:  BackgroundLayer;
  // Array — supports single hero or multi-product ads
  products:    ProductLayer[];
  text_layers: TextLayer[];
  decorative:  DecorativeLayer[];
  // Optional — only present if the ad has a visible logo image
  logo?:       LogoLayer;
  audio:       AudioConfig;
  motion:      MotionConfig;
};

// ─── Lookup maps (used by AdMeta at render time) ──────────────────────────────

export const SPRING_PRESETS: Record<SpringPreset, { damping: number; stiffness: number }> = {
  bouncy:  { damping:  8,  stiffness: 280 },
  crispy:  { damping: 14,  stiffness: 380 },
  soft:    { damping: 18,  stiffness: 160 },
  snappy:  { damping: 22,  stiffness: 260 },
  instant: { damping: 100, stiffness: 500 },
};

export const LETTER_SPACING_MAP: Record<LetterSpacing, string> = {
  tight:     "-0.04em",
  normal:    "0em",
  wide:      "0.08em",
  very_wide: "0.18em",
};

export const LINE_HEIGHT_MAP: Record<LineHeight, number> = {
  tight:  0.95,
  normal: 1.25,
  loose:  1.55,
};
