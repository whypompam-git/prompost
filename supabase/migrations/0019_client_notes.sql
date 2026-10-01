-- Call/contact log per client, so staff can see what was discussed and when.
create table if not exists client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

alter table client_notes enable row level security;
create policy "open access - no auth yet" on client_notes for all using (true) with check (true);
