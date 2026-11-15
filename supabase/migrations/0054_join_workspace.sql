-- Phase 3: sign up, create a workspace, or ask to join one by its Workspace ID.
alter table accounts add column if not exists display_name text;
alter table workspaces add column if not exists created_by uuid references accounts(id) on delete set null;

-- A person asks to join a workspace; its owner approves (a staff row is created) or declines.
create table if not exists workspace_join_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references staff(id) on delete set null
);
create unique index if not exists join_requests_one_pending on workspace_join_requests (workspace_id, account_id) where status = 'pending';
create index if not exists join_requests_ws_idx on workspace_join_requests (workspace_id, status);
alter table workspace_join_requests enable row level security;
revoke all on workspace_join_requests from anon, authenticated;
