-- Add Remotion Lambda render tracking columns to variant_outputs
alter table if exists variant_outputs
  add column if not exists render_id        text,
  add column if not exists render_status    text default 'none'
    check (render_status in ('none','rendering','done','failed')),
  add column if not exists final_video_url  text;
