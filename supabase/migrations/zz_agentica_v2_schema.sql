-- ── Agentica v2 Schema Migration ─────────────────────────────────────────────
-- Run this in Supabase SQL Editor.
-- Safe to run multiple times (all statements use IF NOT EXISTS / IF EXISTS).

-- ─── 1. reference_library additions ──────────────────────────────────────────

alter table reference_library
  add column if not exists composition_template text,
  add column if not exists key_frames           text[] default '{}';

-- Drop NOT NULL + CHECK constraints so analysis can run before these are set
alter table reference_library
  alter column style_category drop not null,
  alter column engine         drop not null;


-- ─── 2. base_ads additions ────────────────────────────────────────────────────

alter table base_ads
  add column if not exists ad_type    text,
  add column if not exists angle      text,
  add column if not exists brand_fit  text;

-- Drop NOT NULL constraints — generate-from-upload sets these dynamically
alter table base_ads
  alter column style_category drop not null,
  alter column engine         drop not null;


-- ─── 3. projects table (new) ─────────────────────────────────────────────────

create table if not exists projects (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  brand_name         text,
  logo_url           text,
  product_images     text[]  default '{}',
  product_context    jsonb,
  selected_reference uuid    references reference_library(id) on delete set null,
  created_at         timestamptz not null default now()
);

create index if not exists idx_projects_user on projects (user_id);

alter table projects enable row level security;

create policy "Users can read their own projects"
  on projects for select
  using (auth.uid() = user_id);

create policy "Users can insert their own projects"
  on projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own projects"
  on projects for update
  using (auth.uid() = user_id);

create policy "Service role full access to projects"
  on projects for all
  using (true)
  with check (true);


-- ─── 4. variant_outputs additions ────────────────────────────────────────────

alter table variant_outputs
  add column if not exists project_id        uuid references projects(id) on delete set null,
  add column if not exists generation_prompt text,
  add column if not exists raw_clip_url      text,
  add column if not exists formats           jsonb,
  add column if not exists engine_used       text,
  add column if not exists promoted          boolean not null default false;

create index if not exists idx_variant_outputs_project on variant_outputs (project_id);

-- Widen the status check to cover all pipeline states
alter table variant_outputs
  drop constraint if exists variant_outputs_status_check;

alter table variant_outputs
  add constraint variant_outputs_status_check
  check (status in ('draft','generating','processing','done','failed','rejected'));

-- Widen video_status check to cover all polling states
alter table variant_outputs
  drop constraint if exists variant_outputs_video_status_check;

alter table variant_outputs
  add constraint variant_outputs_video_status_check
  check (video_status in ('none','processing','ready','failed'));


-- ─── 5. Promote winner: add promoted_from to base_ads ────────────────────────

alter table base_ads
  add column if not exists promoted_from uuid references variant_outputs(id) on delete set null;
