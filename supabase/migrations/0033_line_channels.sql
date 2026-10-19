-- LINE digest channels: each has its own group, send hour (Bangkok time),
-- topics and optional team filter. With no rows the old single-group setup
-- (LINE_TO env, everything, 08:00) keeps working.
create table if not exists line_channels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  group_id text not null,
  send_hour int not null default 8 check (send_hour between 0 and 23),
  topics text[] not null default array['payments', 'tasks', 'leave'],
  team_id uuid references teams(id) on delete set null,
  enabled boolean not null default true,
  last_sent_on date,
  created_at timestamptz not null default now()
);
alter table line_channels enable row level security;
revoke all on line_channels from anon, authenticated;
