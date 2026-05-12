// ─── Pass 2: Structural corrector ─────────────────────────────────────────────
// Runs AFTER normalizeSchema(). Fixes cross-field inconsistencies that the
// field-level normalizer cannot catch: stagger collapse, out-of-bounds positions,
// undersized hero product, decorative shape self-consistency, and text collisions.

import type { AdSchema, BackgroundLayer, DecorativeLayer, ProductLayer, TextLayer } from "./ad-schema";

// ── Bounds helpers ─────────────────────────────────────────────────────────────

function fixXBounds(x: number, w: number): number {
  if (x + w > 99) return Math.max(0, 99 - w);
  return Math.max(0, x);
}

function fixYBounds(y: number, h: number): number {
  if (y + h > 99) return Math.max(0, 99 - h);
  return Math.max(0, y);
}

// ── Background fallback ────────────────────────────────────────────────────────
// If the background is video/image but src_url is empty, fall back to a solid
// dark colour so the ad doesn't render on a blank white canvas.

function fixBackground(bg: BackgroundLayer): BackgroundLayer {
  if ((bg.type === "video" || bg.type === "image") && (!bg.src_url || bg.src_url === "")) {
    // Demote to gradient so something visible renders
    return {
      ...bg,
      type:              "gradient",
      gradient_colors:   ["#0f0f0f", "#1a1a2e"],
      gradient_direction: "to_bottom",
    };
  }
  return bg;
}

// ── Hero product sizing ────────────────────────────────────────────────────────

function fixProducts(products: ProductLayer[]): ProductLayer[] {
  return products.map((p, i) => {
    let { x_pct, y_pct, width_pct, height_pct } = p;

    // Hero product too small → set to a visible default and re-center
    if (i === 0 && width_pct < 35) {
      width_pct  = 56;
      height_pct = 62;
      x_pct      = (100 - width_pct) / 2;
      y_pct      = 15;
    }

    // Clamp to frame
    width_pct  = Math.min(width_pct,  98);
    height_pct = Math.min(height_pct, 98);
    x_pct      = fixXBounds(x_pct, width_pct);
    y_pct      = fixYBounds(y_pct, height_pct);

    return { ...p, x_pct, y_pct, width_pct, height_pct };
  });
}

// ── Text position collision resolver ──────────────────────────────────────────
// Sorts text layers by y_pct and pushes any that are within MIN_GAP of the
// previous one downward. Prevents layers from rendering on top of each other.
// Also enforces a minimum font size so tiny/invisible layers don't appear.

const MIN_VERTICAL_GAP = 9; // % — minimum space between text layer tops
const MIN_FONT_SIZE_VW = 1.5;

function fixTextCollisions(layers: TextLayer[]): TextLayer[] {
  if (layers.length <= 1) return layers;

  // Sort by y_pct ascending
  const sorted = [...layers]
    .map(t => ({
      ...t,
      // Clamp x/width
      x_pct:     Math.max(0, Math.min(t.x_pct, 99 - t.width_pct)),
      width_pct: Math.min(t.width_pct, 98),
      // Enforce minimum font size
      font_size_vw: Math.max(t.font_size_vw, MIN_FONT_SIZE_VW),
    }))
    .sort((a, b) => a.y_pct - b.y_pct);

  // Push layers down until there's no collision
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const minY = prev.y_pct + MIN_VERTICAL_GAP;
    if (curr.y_pct < minY) {
      sorted[i] = { ...curr, y_pct: Math.min(minY, 92) };
    }
  }

  return sorted;
}

// ── Decorative shape self-consistency ─────────────────────────────────────────

function fixDecorative(layers: DecorativeLayer[]): DecorativeLayer[] {
  return layers.map(d => {
    let { x_pct, y_pct, width_pct, height_pct } = d;

    switch (d.type) {
      case "circle_ring": {
        const size = Math.min(width_pct, height_pct);
        width_pct  = size;
        height_pct = size;
        break;
      }
      case "accent_line": {
        height_pct = Math.min(height_pct, 0.7);
        if (width_pct < 10) width_pct = 60;
        break;
      }
      case "sweep_line": {
        height_pct = Math.min(height_pct, 0.45);
        break;
      }
      case "glow": {
        if (width_pct  < 30) { width_pct  = 55; x_pct = Math.max(0, 50 - 27.5); }
        if (height_pct < 30) { height_pct = 55; y_pct = Math.max(0, 50 - 27.5); }
        break;
      }
      case "dot_pattern": {
        if (width_pct  < 30) width_pct  = 50;
        if (height_pct < 25) height_pct = 35;
        break;
      }
    }

    width_pct  = Math.min(width_pct,  100);
    height_pct = Math.min(height_pct, 100);
    x_pct      = fixXBounds(x_pct, width_pct);
    y_pct      = fixYBounds(y_pct, height_pct);

    return { ...d, x_pct, y_pct, width_pct, height_pct };
  });
}

// ── Entrance stagger enforcement ───────────────────────────────────────────────

// Stagger timing by pacing — how many seconds between each layer entering
const PACING_STAGGER: Record<string, { text: number; product: number; dec: number; textStart: number }> = {
  whiplash:   { text: 0.04, product: 0.06, dec: 0.04, textStart: 0.15 },
  fast_punch: { text: 0.07, product: 0.08, dec: 0.06, textStart: 0.22 },
  medium:     { text: 0.14, product: 0.10, dec: 0.08, textStart: 0.40 },
  slow_build: { text: 0.24, product: 0.12, dec: 0.10, textStart: 0.55 },
};

function restaggerEntrances(schema: AdSchema): AdSchema {
  const allTimes = [
    ...schema.products.map(p => p.entrance_start_sec),
    ...schema.text_layers.map(t => t.entrance_start_sec),
    ...schema.decorative.map(d => d.entrance_start_sec),
  ];

  if (allTimes.length === 0) return schema;

  const range = Math.max(...allTimes) - Math.min(...allTimes);
  if (range >= 0.3) return schema;

  const pacing  = schema.motion?.overall_pacing ?? "medium";
  const timing  = PACING_STAGGER[pacing] ?? PACING_STAGGER.medium;

  const bgProducts = schema.products.filter(p => p.z_layer === "behind_all_text");
  const fgProducts = schema.products.filter(p => p.z_layer !== "behind_all_text");

  const ROLE_ORDER: Record<string, number> = { hook: 0, subtext: 1, cta: 2, brand: 3, label: 4, other: 5 };
  const sortedTexts = [...schema.text_layers].sort(
    (a, b) => (ROLE_ORDER[a.role] ?? 5) - (ROLE_ORDER[b.role] ?? 5)
  );

  return {
    ...schema,
    products: [
      ...bgProducts.map((p, i) => ({ ...p, entrance_start_sec: 0.08 + i * timing.product })),
      ...fgProducts.map((p, i) => ({ ...p, entrance_start_sec: 0.3  + i * timing.product })),
    ],
    decorative: schema.decorative.map((d, i) => ({
      ...d,
      entrance_start_sec:    0.12 + i * timing.dec,
      entrance_duration_sec: Math.min(d.entrance_duration_sec, pacing === "whiplash" ? 0.12 : pacing === "fast_punch" ? 0.18 : 0.35),
    })),
    text_layers: sortedTexts.map((t, i) => ({
      ...t,
      entrance_start_sec: timing.textStart + i * timing.text,
    })),
  };
}

// ── Root export ────────────────────────────────────────────────────────────────

export function correctSchema(schema: AdSchema): AdSchema {
  let s = schema;
  s = { ...s, background:  fixBackground(s.background) };
  s = { ...s, products:    fixProducts(s.products) };
  s = { ...s, text_layers: fixTextCollisions(s.text_layers) };
  s = { ...s, decorative:  fixDecorative(s.decorative) };
  s = restaggerEntrances(s);
  return s;
}
