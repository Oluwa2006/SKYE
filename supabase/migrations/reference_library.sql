-- ── Reference Library ────────────────────────────────────────────────────
-- Run this in Supabase SQL Editor.
-- Also create a Storage bucket named "reference-library" with public access.

create table if not exists reference_library (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  video_url       text not null,                -- direct MP4 URL in Supabase Storage
  thumbnail_url   text,                          -- JPG screenshot of best frame
  style_category  text not null check (
    style_category in ('cinematic','lifestyle','product','text-forward','energetic')
  ),
  engine          text not null check (
    engine in ('higgsfield','kling','pika')
  ),
  prompt          jsonb,                         -- structured prompt JSON {shot_type, visual_style, motion, lighting, mood, full_prompt}
  approved_by     text,
  date_added      timestamptz not null default now(),
  is_approved     boolean not null default true,
  tags            text[] default '{}'
);

-- Index for fast category filtering
create index if not exists idx_reference_library_category
  on reference_library (style_category);

-- RLS
alter table reference_library enable row level security;

-- Allow all authenticated users to read approved references
create policy "Anyone can read approved references"
  on reference_library for select
  using (is_approved = true);

-- Only service role can insert/update/delete
create policy "Service role full access"
  on reference_library for all
  using (true)
  with check (true);
