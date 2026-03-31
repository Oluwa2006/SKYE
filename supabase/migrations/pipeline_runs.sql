-- pipeline_runs: tracks each full pipeline execution
create table if not exists pipeline_runs (
  id            uuid primary key default gen_random_uuid(),
  status        text not null default 'running',   -- running | complete | failed
  started_at    timestamptz not null default now(),
  completed_at  timestamptz,
  error         text,
  scrape_result  jsonb,
  analyze_result jsonb,
  ideas_result   jsonb
);

-- allow the service-role key (used by supabaseAdmin) to read/write freely
alter table pipeline_runs enable row level security;

create policy "service role full access" on pipeline_runs
  for all
  using (true)
  with check (true);
