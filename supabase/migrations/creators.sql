-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New Query)

CREATE TABLE IF NOT EXISTS creators (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  handle          text NOT NULL,
  name            text,
  platform        text NOT NULL DEFAULT 'instagram',
  profile_photo_url text,
  location        text,
  followers       integer DEFAULT 0,
  engagement_rate numeric(5,2) DEFAULT 0,
  avg_views       integer DEFAULT 0,
  posts_per_week  numeric(3,1) DEFAULT 0,
  niche_tags      text[] DEFAULT '{}',
  brand_fit_score numeric(3,1) DEFAULT 0,
  est_cost_min    integer DEFAULT 0,
  est_cost_max    integer DEFAULT 0,
  pipeline_stage  text NOT NULL DEFAULT 'Discovered',
  agreed_rate     integer,
  deliverables    text,
  deal_notes      text,
  due_date        date,
  added_at        timestamptz DEFAULT now(),
  last_updated    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS creator_activity (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id  uuid REFERENCES creators(id) ON DELETE CASCADE,
  action      text NOT NULL,
  note        text,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS creator_posts (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id       uuid REFERENCES creators(id) ON DELETE CASCADE,
  post_url         text,
  thumbnail_url    text,
  caption          text,
  likes            integer DEFAULT 0,
  comments         integer DEFAULT 0,
  views            integer DEFAULT 0,
  estimated_reach  integer DEFAULT 0,
  posted_at        timestamptz,
  content_pillar   text,
  scraped_at       timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS creators_pipeline_stage_idx ON creators(pipeline_stage);
CREATE INDEX IF NOT EXISTS creator_activity_creator_id_idx ON creator_activity(creator_id);
CREATE INDEX IF NOT EXISTS creator_posts_creator_id_idx ON creator_posts(creator_id);
