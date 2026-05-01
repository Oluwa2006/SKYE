-- ── Starter Reference Templates (seed data) ─────────────────────────────────
-- Run after reference_library.sql migration.
-- These are style templates only — no real video files attached yet.
-- thumbnail_url and video_url can be updated once real assets are uploaded.

insert into reference_library (
  title, video_url, thumbnail_url, style_category, engine,
  prompt, approved_by, is_approved, tags
) values

-- ── Cinematic ─────────────────────────────────────────────────────────────────
(
  'Golden Hour Reveal',
  '',
  null,
  'cinematic',
  'higgsfield',
  '{"shot_type": "slow push-in", "visual_style": "film grain, warm amber grade", "motion": "smooth dolly forward", "lighting": "golden hour backlight, deep shadows", "mood": "Premium, aspirational, emotionally resonant", "full_prompt": "Cinematic slow push-in shot, warm golden hour backlight, deep rich shadows with amber highlights, shallow depth of field, 35mm film grain texture, premium aspirational mood, smooth dolly movement forward, professional colour grade."}',
  'seed',
  true,
  '{"cinematic","luxury","warm","premium"}'
),
(
  'Dark Drama',
  '',
  null,
  'cinematic',
  'higgsfield',
  '{"shot_type": "static wide", "visual_style": "teal-orange grade, high contrast", "motion": "none — subject moves", "lighting": "hard dramatic side-light", "mood": "Powerful, tense, unforgettable", "full_prompt": "Dramatic wide shot, hard directional side-lighting, deep teal shadows with warm orange highlights, shallow depth of field on subject, still camera with subject movement, intense moody atmosphere, Hollywood blockbuster colour grade."}',
  'seed',
  true,
  '{"cinematic","dark","drama","intense"}'
),

-- ── Lifestyle ─────────────────────────────────────────────────────────────────
(
  'UGC Authentic',
  '',
  null,
  'lifestyle',
  'higgsfield',
  '{"shot_type": "handheld close-up", "visual_style": "natural, unfiltered", "motion": "slight sway", "lighting": "soft window daylight", "mood": "Real, genuine, trustworthy — feels filmed by a friend", "full_prompt": "Authentic handheld footage, natural warm daylight, casual real-life environment, genuine unposed moment, slight camera sway, social-media-native feel, soft natural shadows, approachable everyday aesthetic."}',
  'seed',
  true,
  '{"ugc","authentic","lifestyle","social"}'
),
(
  'Minimal Clean',
  '',
  null,
  'lifestyle',
  'pika',
  '{"shot_type": "static overhead or straight-on", "visual_style": "light, airy, minimal", "motion": "subtle drift", "lighting": "soft diffused studio", "mood": "Calm, refined, premium-minimal", "full_prompt": "Minimal clean composition, soft diffused studio lighting, neutral light background, gentle subtle motion only, elegant simplicity, premium lifestyle aesthetic, calm and refined mood, no clutter."}',
  'seed',
  true,
  '{"minimal","clean","lifestyle","refined"}'
),

-- ── Product ───────────────────────────────────────────────────────────────────
(
  'Studio Hero Shot',
  '',
  null,
  'product',
  'pika',
  '{"shot_type": "straight-on or 3/4", "visual_style": "pure white/grey bg, hard key light", "motion": "gentle rotate or float", "lighting": "high-contrast key, clean shadows", "mood": "Confident, premium, commercial — product is the star", "full_prompt": "Clean studio product shot, pure white or light-grey background, sharp high-contrast key lighting, crisp edges, minimal composition centred on the subject, subtle gentle animation bringing it to life, professional commercial quality."}',
  'seed',
  true,
  '{"product","studio","clean","commercial"}'
),
(
  'Ken Burns Showcase',
  '',
  null,
  'product',
  'kling',
  '{"shot_type": "slow zoom in or pan", "visual_style": "warm neutral bg, soft vignette", "motion": "slow Ken Burns push", "lighting": "soft fill, subtle shadow", "mood": "Trustworthy, detailed, deliberate — shows off craftsmanship", "full_prompt": "Slow cinematic zoom into product detail, warm neutral background, soft fill lighting with subtle shadow, gentle Ken Burns movement revealing features, premium deliberate pacing, craftsmanship and quality mood."}',
  'seed',
  true,
  '{"product","ken-burns","detail","craftsmanship"}'
),

-- ── Energetic ─────────────────────────────────────────────────────────────────
(
  'Energetic Promo',
  '',
  null,
  'energetic',
  'kling',
  '{"shot_type": "fast dynamic pan or whip", "visual_style": "high saturation, bold contrast", "motion": "fast camera pan with motion blur", "lighting": "punchy, high-contrast, vivid", "mood": "Urgent, exciting, FOMO-inducing — must act now", "full_prompt": "High-energy dynamic shot, bold saturated colours, fast purposeful camera pan, punchy vibrant lighting, urgent exciting mood, strong visual impact, commercial advertisement energy, high contrast vivid grade."}',
  'seed',
  true,
  '{"energetic","promo","urgent","bold"}'
),
(
  'Flash Sale Drop',
  '',
  null,
  'energetic',
  'kling',
  '{"shot_type": "rapid cuts, close-up burst", "visual_style": "red-hot palette, glare effects", "motion": "snap zoom burst", "lighting": "dramatic flash, high contrast red", "mood": "Explosive, limited time, can not miss — deal energy", "full_prompt": "Rapid snap-zoom burst shot, bold red-dominant palette with high contrast, dramatic flash lighting effects, urgent commercial energy, time-limited deal atmosphere, bold loud visual language, fast-cut social ad pacing."}',
  'seed',
  true,
  '{"flash-sale","energetic","red","urgent"}'
),

-- ── Text-Forward ──────────────────────────────────────────────────────────────
(
  'Words That Hit',
  '',
  null,
  'text-forward',
  'pika',
  '{"shot_type": "abstract background, dim", "visual_style": "dark moody bg, text is hero", "motion": "slow drift or subtle parallax", "lighting": "dark, heavy dim overlay", "mood": "Thought-provoking, punchy, memorable — words are the ad", "full_prompt": "Dark moody abstract background, heavily dimmed to near-black, slow subtle parallax drift, minimal visual noise, designed to be overlaid with bold text, contemplative and impactful mood, typographic-forward composition."}',
  'seed',
  true,
  '{"text-forward","moody","dark","copy-led"}'
);
