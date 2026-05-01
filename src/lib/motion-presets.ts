// ─── Motion preset system ─────────────────────────────────────────────────────
// A preset is a curated animation personality applied on top of the corrected
// schema. It overrides spring feel, entrance styles, stagger, and visible
// animations with known-good combinations — instead of trusting every value
// Gemini invented from a single reference video.
//
// Gemini picks one preset during analysis. The stored schema keeps the preset
// name so admins can swap it without re-running Gemini.

import type {
  AdSchema,
  ProductLayer,
  TextLayer,
  DecorativeLayer,
  SpringPreset,
  ProductEntrance,
  ProductVisibleAnimation,
  TextEntrance,
  DecorativeEntrance,
} from "./ad-schema";

export type MotionPresetName =
  | "snappy_commerce"   // clean product ads, e-commerce, fast decisive feel
  | "soft_lifestyle"    // aspirational, warm, slow reveal
  | "high_energy"       // food, drops, hype — loud and fast
  | "premium_minimal"   // luxury, SaaS, understated sophistication
  | "food_hype";        // restaurant, plating, hero close-up with bounce

// ── Preset definitions ────────────────────────────────────────────────────────

interface PresetConfig {
  spring:            SpringPreset;
  overall_pacing:    AdSchema["motion"]["overall_pacing"];
  // Product
  product_entrance:  ProductEntrance;
  product_visible:   ProductVisibleAnimation;
  // Text entrances by role — fallback is last item
  text_entrances:    Partial<Record<TextLayer["role"], TextEntrance>> & { _default: TextEntrance };
  text_stagger_ms:   number;
  // Decorative
  dec_entrance_line: DecorativeEntrance; // for accent_line / sweep_line
  dec_entrance_shape: DecorativeEntrance; // for glow / circle_ring / dot_pattern / shape
}

const PRESETS: Record<MotionPresetName, PresetConfig> = {
  snappy_commerce: {
    spring:             "snappy",
    overall_pacing:     "medium",
    product_entrance:   "scale",
    product_visible:    "static",
    text_entrances:     { hook: "scale_punch", subtext: "line_reveal", cta: "snap_in", brand: "fade_in", _default: "line_reveal" },
    text_stagger_ms:    100,
    dec_entrance_line:  "grow_width",
    dec_entrance_shape: "scale",
  },
  soft_lifestyle: {
    spring:             "soft",
    overall_pacing:     "slow_build",
    product_entrance:   "fade",
    product_visible:    "float",
    text_entrances:     { hook: "rise", subtext: "blur_in", cta: "fade_in", brand: "fade_in", _default: "rise" },
    text_stagger_ms:    260,
    dec_entrance_line:  "fade",
    dec_entrance_shape: "fade",
  },
  high_energy: {
    spring:             "bouncy",
    overall_pacing:     "fast_punch",
    product_entrance:   "slam",
    product_visible:    "static",
    text_entrances:     { hook: "word_by_word", subtext: "scale_punch", cta: "snap_in", brand: "fade_in", _default: "snap_in" },
    text_stagger_ms:    80,
    dec_entrance_line:  "grow_width",
    dec_entrance_shape: "scale",
  },
  premium_minimal: {
    spring:             "snappy",
    overall_pacing:     "slow_build",
    product_entrance:   "fade",
    product_visible:    "slow_zoom_in",
    text_entrances:     { hook: "line_reveal", subtext: "blur_in", cta: "mask_wipe", brand: "fade_in", _default: "blur_in" },
    text_stagger_ms:    340,
    dec_entrance_line:  "fade",
    dec_entrance_shape: "fade",
  },
  food_hype: {
    spring:             "bouncy",
    overall_pacing:     "fast_punch",
    product_entrance:   "scale",
    product_visible:    "float",
    text_entrances:     { hook: "word_by_word", subtext: "line_reveal", cta: "scale_punch", brand: "fade_in", _default: "line_reveal" },
    text_stagger_ms:    110,
    dec_entrance_line:  "grow_width",
    dec_entrance_shape: "scale",
  },
};

// ── Apply ─────────────────────────────────────────────────────────────────────

function applyToProduct(p: ProductLayer, cfg: PresetConfig): ProductLayer {
  return {
    ...p,
    entrance:          cfg.product_entrance,
    visible_animation: cfg.product_visible,
  };
}

function applyToText(t: TextLayer, cfg: PresetConfig, idx: number): TextLayer {
  const entrance = cfg.text_entrances[t.role] ?? cfg.text_entrances._default;
  return {
    ...t,
    entrance,
    entrance_start_sec: t.entrance_start_sec + idx * 0.001, // preserve relative order
    stagger_ms: cfg.text_stagger_ms,
  };
}

function applyToDecorative(d: DecorativeLayer, cfg: PresetConfig): DecorativeLayer {
  const isLine = d.type === "accent_line" || d.type === "sweep_line";
  return {
    ...d,
    entrance: isLine ? cfg.dec_entrance_line : cfg.dec_entrance_shape,
  };
}

export function applyMotionPreset(schema: AdSchema, preset: MotionPresetName): AdSchema {
  const cfg = PRESETS[preset];
  return {
    ...schema,
    products:    schema.products.map(p => applyToProduct(p, cfg)),
    text_layers: schema.text_layers.map((t, i) => applyToText(t, cfg, i)),
    decorative:  schema.decorative.map(d => applyToDecorative(d, cfg)),
    motion: {
      ...schema.motion,
      spring_preset:   cfg.spring,
      overall_pacing:  cfg.overall_pacing,
      motion_preset:   preset,
    },
  };
}

export { PRESETS };
