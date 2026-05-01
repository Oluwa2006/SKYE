-- Adds ad_schema column to store the full AdSchema JSON from Gemini analysis.
-- AdMeta composition reads this directly at render time.
alter table ad_templates
  add column if not exists ad_schema jsonb;
