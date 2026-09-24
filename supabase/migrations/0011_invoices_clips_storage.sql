-- Invoices (ใบแจ้งหนี้), per-package clip counts, and a real storage bucket
-- for transaction slips.

alter table packages
  add column if not exists clip_count int not null default 0;

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  invoice_no text unique,
  items jsonb not null default '[]',
  vat_percent numeric not null default 7,
  wht_percent numeric not null default 0,
  status text not null default 'unpaid', -- unpaid | paid
  due_date date,
  payment_note text,
  notes text,
  share_token uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now()
);

alter table invoices enable row level security;
create policy "open access - no auth yet" on invoices for all using (true) with check (true);

insert into storage.buckets (id, name, public)
values ('slips', 'slips', true)
on conflict (id) do nothing;

create policy "slips open read" on storage.objects for select using (bucket_id = 'slips');
create policy "slips open insert" on storage.objects for insert with check (bucket_id = 'slips');
