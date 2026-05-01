-- ── Ad Templates Table ───────────────────────────────────────────────────────
-- Stores rendered ads that admins have saved as user-facing templates.
-- Safe to run multiple times.

create table if not exists ad_templates (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  composition_id  text not null,
  video_url       text not null,
  duration        text not null default '15s',
  accent_color    text not null default '#1d4ed8',
  bg_color        text not null default '#eff6ff',
  description     text,
  text_slots      jsonb not null default '[]',
  required_angle  text not null default 'any',
  angle_hint      text not null default 'Product photo',
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

alter table ad_templates enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'ad_templates'
    and policyname = 'Authenticated users read active templates'
  ) then
    create policy "Authenticated users read active templates"
      on ad_templates for select
      to authenticated
      using (is_active = true);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'ad_templates'
    and policyname = 'Service role full access to ad_templates'
  ) then
    create policy "Service role full access to ad_templates"
      on ad_templates for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end $$;
