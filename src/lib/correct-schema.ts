// ─── Pass 2: Structural corrector ─────────────────────────────────────────────
// Runs AFTER normalizeSchema(). Fixes cross-field inconsistencies that the
// field-level normalizer cannot catch: stagger collapse, out-of-bounds positions,
// undersized hero product, and decorative shape self-consistency.

import type { AdSchema, DecorativeLayer, ProductLayer, TextLayer } from "./ad-schema";

// ── Bounds helpers ─────────────────────────────────────────────────────────────

function fixXBounds(x: number, w: number): number {
  if (x + w > 99) return Math.max(0, 99 - w);
  return Math.max(0, x);
}

function fixYBounds(y: number, h: number): number {
  if (y + h > 99) return Math.max(0, 99 - h);
  return Math.max(0, y);
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

// ── Text bounds (no height_pct — only x + width matter) ───────────────────────

function fixTexts(layers: TextLayer[]): TextLayer[] {
  return layers.map(t => {
    let { x_pct, width_pct } = t;
    width_pct = Math.min(width_pct, 98);
    x_pct     = fixXBounds(x_pct, width_pct);
    return { ...t, x_pct, width_pct };
  });
}

// ── Decorative shape self-consistency ─────────────────────────────────────────

function fixDecorative(layers: DecorativeLayer[]): DecorativeLayer[] {
  return layers.map(d => {
    let { x_pct, y_pct, width_pct, height_pct } = d;

    switch (d.type) {
      case "circle_ring": {
        // Must be square to look like a circle
        const size = Math.min(width_pct, height_pct);
        width_pct  = size;
        height_pct = size;
        break;
      }
      case "accent_line": {
        // Thin horizontal rule — cap height, ensure minimum width
        height_pct = Math.min(height_pct, 0.7);
        if (width_pct < 10) width_pct = 60;
        break;
      }
      case "sweep_line": {
        height_pct = Math.min(height_pct, 0.45);
        break;
      }
      case "glow": {
        // Must be large enough for the blur to be visible
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

    // Final bounds clamp
    width_pct  = Math.min(width_pct,  100);
    height_pct = Math.min(height_pct, 100);
    x_pct      = fixXBounds(x_pct, width_pct);
    y_pct      = fixYBounds(y_pct, height_pct);

    return { ...d, x_pct, y_pct, width_pct, height_pct };
  });
}

// ── Entrance stagger enforcement ───────────────────────────────────────────────
// If all layers enter within 0.3s of each other, redistribute by z-order.
// This is the most common reason renders feel flat — everything pops at once.

function restaggerEntrances(schema: AdSchema): AdSchema {
  const allTimes = [
    ...schema.products.map(p => p.entrance_start_sec),
    ...schema.text_layers.map(t => t.entrance_start_sec),
    ...schema.decorative.map(d => d.entrance_start_sec),
  ];

  if (allTimes.length === 0) return schema;

  const range = Math.max(...allTimes) - Math.min(...allTimes);
  if (range >= 0.3) return schema; // already staggered — leave it

  // Redistribute by z-order
  const bgProducts = schema.products.filter(p => p.z_layer === "behind_all_text");
  const fgProducts = schema.products.filter(p => p.z_layer !== "behind_all_text");

  // Role order for text stagger
  const ROLE_ORDER: Record<string, number> = { hook: 0, subtext: 1, cta: 2, brand: 3, label: 4, other: 5 };
  const sortedTexts = [...schema.text_layers].sort(
    (a, b) => (ROLE_ORDER[a.role] ?? 5) - (ROLE_ORDER[b.role] ?? 5)
  );

  return {
    ...schema,
    products: [
      ...bgProducts.map((p, i) => ({ ...p, entrance_start_sec: 0.1 + i * 0.1 })),
      ...fgProducts.map((p, i) => ({ ...p, entrance_start_sec: 0.4 + i * 0.1 })),
    ],
    decorative: schema.decorative.map((d, i) => ({
      ...d,
      entrance_start_sec: 0.25 + i * 0.08,
    })),
    text_layers: sortedTexts.map((t, i) => ({
      ...t,
      entrance_start_sec: 0.5 + i * 0.22,
    })),
  };
}

// ── Root export ────────────────────────────────────────────────────────────────

export function correctSchema(schema: AdSchema): AdSchema {
  let s = schema;
  s = { ...s, products:    fixProducts(s.products) };
  s = { ...s, text_layers: fixTexts(s.text_layers) };
  s = { ...s, decorative:  fixDecorative(s.decorative) };
  s = restaggerEntrances(s);
  return s;
}
