-- Quality judge scores on variant_outputs
alter table if exists variant_outputs
  add column if not exists quality_score       numeric(3,1),
  add column if not exists quality_pass        boolean,
  add column if not exists quality_notes       text,
  add column if not exists quality_suggestions jsonb;
