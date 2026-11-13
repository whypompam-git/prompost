-- UI v2: team notes (like iPhone Notes — optionally tagged to a client) and a
-- per-client CI brand sheet used to brief editors. Server/proxy access only.
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references staff(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  body text not null default '',
  images text[] not null default '{}',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists notes_author_idx on notes (author_id, updated_at desc);
create index if not exists notes_client_idx on notes (client_id);
alter table notes enable row level security;
revoke all on notes from anon, authenticated;

create table if not exists client_ci (
  client_id uuid primary key references clients(id) on delete cascade,
  logo_url text,
  colors jsonb not null default '[]'::jsonb,   -- [{name, hex}]
  fonts jsonb not null default '[]'::jsonb,    -- [{name, use}]
  subtitle_style text not null default '',
  dont text not null default '',
  files jsonb not null default '[]'::jsonb,    -- [{label, url}]
  notes text not null default '',
  updated_by uuid references staff(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table client_ci enable row level security;
revoke all on client_ci from anon, authenticated;
