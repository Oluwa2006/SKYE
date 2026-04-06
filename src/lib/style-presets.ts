export interface StylePreset {
  id:             string;
  name:           string;
  description:    string;
  engine:         "higgsfield" | "kling" | "pika";
  style_category: string;
  icon:           string;
  accent:         string;
  full_prompt:    string;
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id:             "cinematic-lifestyle",
    name:           "Cinematic Lifestyle",
    description:    "Slow push-in, golden hour, premium feel",
    engine:         "higgsfield",
    style_category: "cinematic",
    icon:           "🎬",
    accent:         "#6d28d9",
    full_prompt:
      "Cinematic slow push-in shot, warm golden hour backlight, deep rich shadows with amber highlights, shallow depth of field, 35mm film grain texture, premium aspirational mood, smooth dolly movement forward, professional colour grade.",
  },
  {
    id:             "bold-product",
    name:           "Bold Product",
    description:    "Clean studio, sharp light, high contrast",
    engine:         "pika",
    style_category: "product",
    icon:           "📦",
    accent:         "#0369a1",
    full_prompt:
      "Clean studio product shot, pure white or light-grey background, sharp high-contrast key lighting, crisp edges, minimal composition centred on the subject, subtle gentle animation bringing it to life, professional commercial quality.",
  },
  {
    id:             "ugc-authentic",
    name:           "UGC Authentic",
    description:    "Handheld, natural light, raw and real",
    engine:         "higgsfield",
    style_category: "lifestyle",
    icon:           "📱",
    accent:         "#065f46",
    full_prompt:
      "Authentic handheld footage, natural warm daylight, casual real-life environment, genuine unposed moment, slight camera sway, social-media-native feel, soft natural shadows, approachable everyday aesthetic.",
  },
  {
    id:             "energetic-promo",
    name:           "Energetic Promo",
    description:    "Dynamic motion, bold colours, urgent energy",
    engine:         "kling",
    style_category: "energetic",
    icon:           "⚡",
    accent:         "#b91c1c",
    full_prompt:
      "High-energy dynamic shot, bold saturated colours, fast purposeful camera pan, punchy vibrant lighting, urgent exciting mood, strong visual impact, commercial advertisement energy, high contrast vivid grade.",
  },
  {
    id:             "minimal-clean",
    name:           "Minimal Clean",
    description:    "Static, soft diffused light, refined",
    engine:         "pika",
    style_category: "lifestyle",
    icon:           "✨",
    accent:         "#374151",
    full_prompt:
      "Minimal clean composition, soft diffused studio lighting, neutral light background, gentle subtle motion only, elegant simplicity, premium lifestyle aesthetic, calm and refined mood, no clutter.",
  },
];

export function getPresetById(id: string): StylePreset | null {
  return STYLE_PRESETS.find(p => p.id === id) ?? null;
}
