-- MC (presenter/model) profiles synced from a Google Sheet (Tally responses),
-- plus shareable proposal packs for clients. Sheet-owned columns are
-- overwritten on every sync; local_* columns and flags are never touched by it.
create table if not exists mc_profiles (
  id uuid primary key default gen_random_uuid(),
  source_id text not null unique,          -- Tally "Submission ID"
  submitted_at timestamptz,
  prefix text, full_name text, nickname text,
  age text, height text, weight text,
  sheet_rate text,                         -- rate typed by the MC (internal)
  phone text, line_id text, ig text, facebook text,
  character text, skills text, experience text, portfolio text,
  photo_url text,                          -- copied into our storage on sync
  photo_source text,                       -- original Tally URL
  -- local, never overwritten by sync:
  extra_photos text[] not null default '{}',
  rate_offer numeric,                      -- our price quoted to clients
  notes text,
  hidden boolean not null default false,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table mc_profiles enable row level security;
revoke all on mc_profiles from anon, authenticated;

create table if not exists mc_settings (
  id boolean primary key default true check (id),
  sheet_url text,
  last_synced_at timestamptz,
  last_result text
);
alter table mc_settings enable row level security;
revoke all on mc_settings from anon, authenticated;
insert into mc_settings (id, sheet_url)
values (true, 'https://docs.google.com/spreadsheets/d/1l_9ooglpwki3gsrBVqyvuSke0I_xiVYQhkRdnV_iOW4/edit?usp=sharing')
on conflict (id) do nothing;

create table if not exists mc_packs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  share_token uuid not null unique default gen_random_uuid(),
  mc_ids uuid[] not null default '{}',
  show jsonb not null default '{}'::jsonb,   -- which fields the client sees
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
alter table mc_packs enable row level security;
revoke all on mc_packs from anon, authenticated;
