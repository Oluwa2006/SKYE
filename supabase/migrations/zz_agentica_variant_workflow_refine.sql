-- Refine Agentica into a simpler base-ad -> variant workflow.
-- Safe to run after agentica_system.sql.

alter table if exists base_ads
  add column if not exists ad_type text;

alter table if exists base_ads
  add column if not exists angle text;

update base_ads
set
  ad_type = coalesce(nullif(ad_type, ''), style_category, 'general'),
  angle = coalesce(nullif(angle, ''), hook, '')
where true;

alter table if exists base_ads
  alter column ad_type set default 'general';

alter table if exists base_ads
  alter column angle set default '';
