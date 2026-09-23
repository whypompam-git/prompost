-- Sellable packages (e.g. "แพ็คเกจรายเดือน 10 คลิป") with their own
-- validity window, and a junction table recording which client is using
-- which package (a client can have several over time — most recent = current).

create table if not exists packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(12, 2) not null default 0,
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

create table if not exists client_packages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  package_id uuid not null references packages(id) on delete cascade,
  assigned_at date not null default current_date,
  created_at timestamptz not null default now()
);

alter table packages enable row level security;
create policy "open access - no auth yet" on packages for all using (true) with check (true);

alter table client_packages enable row level security;
create policy "open access - no auth yet" on client_packages for all using (true) with check (true);
