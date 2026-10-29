-- AI Studio: client context (the files that used to live in the Mac folder),
-- the editable writing rules ("playbooks"), their version history, and a log of
-- every AI run (kind, tokens, cost). No policies: only the server touches them.
create table if not exists client_context (
  client_id uuid not null references clients(id) on delete cascade,
  key text not null,
  content text not null default '',
  updated_by uuid references staff(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (client_id, key)
);
alter table client_context enable row level security;
revoke all on client_context from anon, authenticated;

create table if not exists ai_playbooks (
  key text primary key,
  title text not null,
  content text not null default '',
  updated_by uuid references staff(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table ai_playbooks enable row level security;
revoke all on ai_playbooks from anon, authenticated;

create table if not exists ai_playbook_versions (
  id uuid primary key default gen_random_uuid(),
  playbook_key text not null references ai_playbooks(key) on delete cascade,
  content text not null,
  saved_by uuid references staff(id) on delete set null,
  saved_at timestamptz not null default now()
);
create index if not exists ai_playbook_versions_key_idx on ai_playbook_versions (playbook_key, saved_at desc);
alter table ai_playbook_versions enable row level security;
revoke all on ai_playbook_versions from anon, authenticated;

create table if not exists ai_runs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete set null,
  kind text not null check (kind in ('ideas', 'script', 'revise', 'research')),
  prompt text,
  params jsonb not null default '{}'::jsonb,
  output jsonb,
  model text,
  tokens_in int not null default 0,
  tokens_out int not null default 0,
  cost_thb numeric not null default 0,
  status text not null default 'ok',
  created_by uuid references staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists ai_runs_created_idx on ai_runs (created_at desc);
alter table ai_runs enable row level security;
revoke all on ai_runs from anon, authenticated;
