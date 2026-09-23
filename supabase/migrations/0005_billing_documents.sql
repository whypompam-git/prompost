-- Printable/shareable billing documents (mockup pass): quotations, receipts
-- and (implicitly) invoices all reuse the same document template, which
-- needs real seller/buyer info to match a real Thai ใบเสนอราคา layout.

create table if not exists agency_settings (
  id boolean primary key default true, -- single row, id is always true
  name text,
  address text,
  phone text,
  tax_id text,
  bank_info text,
  constraint agency_settings_singleton check (id)
);

alter table clients
  add column if not exists address text,
  add column if not exists tax_id text;

alter table quotations
  add column if not exists valid_until date,
  add column if not exists payment_note text,
  add column if not exists notes text,
  add column if not exists client_feedback text,
  add column if not exists share_token uuid not null default gen_random_uuid() unique;

alter table receipts
  add column if not exists notes text,
  add column if not exists share_token uuid not null default gen_random_uuid() unique;

alter table agency_settings enable row level security;
create policy "open access - no auth yet" on agency_settings for all using (true) with check (true);
