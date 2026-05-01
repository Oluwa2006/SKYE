-- ── Overlay columns for AdVideoOverlay templates ────────────────────────────
-- Adds the three fields needed to re-render an overlay template from the
-- consumer flow: the reference video URL, the Gemini-detected product
-- position/timing config, and the source video duration.
-- Safe to run multiple times.

alter table ad_templates
  add column if not exists background_video_url text,
  add column if not exists overlay_config       jsonb,
  add column if not exists duration_sec         numeric;
