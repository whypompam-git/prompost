-- "คิว" = a batch of one client's clips shot together (e.g. "คิว1 - OYOKO"),
-- with its own shoot date and crew. Clips get a queue and an order within it.
create table if not exists queues (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  shoot_date date,
  crew uuid[] not null default '{}',
  note text,
  created_at timestamptz not null default now()
);
create index if not exists queues_client_idx on queues (client_id, shoot_date);
alter table queues enable row level security;
revoke all on queues from anon, authenticated;

alter table tasks add column if not exists queue_id uuid references queues(id) on delete set null;
alter table tasks add column if not exists shoot_order int;
create index if not exists tasks_queue_idx on tasks (queue_id);
