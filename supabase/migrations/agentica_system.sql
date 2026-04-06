-- ── Agentica Creative System ─────────────────────────────────────────────────
-- Run this in Supabase SQL Editor.

-- BaseAd: the approved reference ad that becomes the DNA source
create table if not exists base_ads (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  hook            text not null,           -- opening line / attention grab
  script          text not null,           -- body copy / VO script
  cta             text not null,           -- call to action
  style_category  text not null check (
    style_category in ('cinematic','lifestyle','product','text-forward','energetic')
  ),
  engine          text not null check (
    engine in ('higgsfield','kling','pika')
  ),
  video_url       text,                    -- rendered output URL (Supabase Storage)
  thumbnail_url   text,
  brand_id        uuid,                    -- optional future brand scoping
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  is_active       boolean not null default true,
  tags            text[] default '{}'
);

create index if not exists idx_base_ads_style on base_ads (style_category);
create index if not exists idx_base_ads_active on base_ads (is_active);

alter table base_ads enable row level security;

create policy "Authenticated users can read active base ads"
  on base_ads for select
  using (auth.uid() is not null and is_active = true);

create policy "Authenticated users can insert base ads"
  on base_ads for insert
  with check (auth.uid() is not null);

create policy "Creator can update their own base ads"
  on base_ads for update
  using (auth.uid() = created_by);


-- VariantRequest: a job that generates N variants from a base ad
create table if not exists variant_requests (
  id                uuid primary key default gen_random_uuid(),
  base_ad_id        uuid not null references base_ads(id) on delete cascade,
  variation_strength text not null check (variation_strength in ('low','medium','high')),
  num_variants      int not null default 3 check (num_variants between 1 and 10),
  requested_by      uuid references auth.users(id),
  status            text not null default 'pending' check (
    status in ('pending','processing','completed','failed')
  ),
  created_at        timestamptz not null default now(),
  completed_at      timestamptz
);

create index if not exists idx_variant_requests_base on variant_requests (base_ad_id);
create index if not exists idx_variant_requests_status on variant_requests (status);

alter table variant_requests enable row level security;

create policy "Authenticated users can read variant requests"
  on variant_requests for select
  using (auth.uid() is not null);

create policy "Authenticated users can insert variant requests"
  on variant_requests for insert
  with check (auth.uid() is not null);

create policy "Requestor can update their own variant requests"
  on variant_requests for update
  using (auth.uid() = requested_by);


-- VariantOutput: each generated variant with similarity score
create table if not exists variant_outputs (
  id                uuid primary key default gen_random_uuid(),
  request_id        uuid not null references variant_requests(id) on delete cascade,
  base_ad_id        uuid not null references base_ads(id) on delete cascade,
  hook              text not null,
  script            text not null,
  cta               text not null,
  similarity_score  float not null default 0 check (similarity_score between 0 and 1),
  was_rejected      boolean not null default false,    -- true if too similar to base
  rejection_reason  text,
  video_url         text,                              -- filled after video generation
  status            text not null default 'draft' check (
    status in ('draft','generating','ready','rejected')
  ),
  created_at        timestamptz not null default now()
);

create index if not exists idx_variant_outputs_request on variant_outputs (request_id);
create index if not exists idx_variant_outputs_base on variant_outputs (base_ad_id);

alter table variant_outputs enable row level security;

create policy "Authenticated users can read variant outputs"
  on variant_outputs for select
  using (auth.uid() is not null);

create policy "Service role full access to variant outputs"
  on variant_outputs for all
  using (true)
  with check (true);
