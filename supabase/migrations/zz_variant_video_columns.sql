-- Add video generation tracking columns to variant_outputs.
-- Safe to run after agentica_system.sql.

alter table if exists variant_outputs
  add column if not exists video_task_id  text,
  add column if not exists video_status   text default 'none'
    check (video_status in ('none','processing','ready','failed')),
  add column if not exists video_engine   text,
  add column if not exists video_prompt   text;
  