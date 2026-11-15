-- Anti-abuse counters for sign up / log in / join (server-only). The key is a salted hash
-- of the visitor's IP — the IP itself is never stored.
create table if not exists auth_rate_events (
  id bigint generated always as identity primary key,
  kind text not null,
  key text not null,
  created_at timestamptz not null default now()
);
create index if not exists auth_rate_events_lookup on auth_rate_events (kind, key, created_at);
create index if not exists auth_rate_events_created on auth_rate_events (created_at);
alter table auth_rate_events enable row level security;
revoke all on auth_rate_events from anon, authenticated;
