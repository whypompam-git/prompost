-- Contracts of three kinds: client (we are hired), monthly (a team member on a
-- monthly service agreement) and freelance (an outsource batch of N clips).
-- Signer ID card / address go to a separate owner-only table; signatures of new
-- signings go to a private bucket.

alter table contracts add column if not exists kind text not null default 'client';
alter table contracts drop constraint if exists contracts_kind_check;
alter table contracts add constraint contracts_kind_check check (kind in ('client', 'monthly', 'freelance'));
alter table contracts add column if not exists staff_id uuid references staff(id) on delete restrict;
alter table contracts alter column client_id drop not null;
alter table contracts drop constraint if exists contracts_party_check;
alter table contracts add constraint contracts_party_check check (
  (kind = 'client' and client_id is not null) or (kind <> 'client' and staff_id is not null)
);
alter table contracts add column if not exists term_months int;
alter table contracts add column if not exists payment_mode text;           -- monthly | deposit | custom
alter table contracts add column if not exists terms jsonb not null default '{}'::jsonb;
alter table contracts add column if not exists clip_count int;
alter table contracts add column if not exists price_per_clip numeric(12, 2);
alter table contracts add column if not exists renewed_from uuid references contracts(id) on delete set null;
alter table contracts add column if not exists estamp_ref text;
alter table contracts add column if not exists pdf_path text;
create index if not exists contracts_staff_idx on contracts (staff_id);
create index if not exists contracts_kind_end_idx on contracts (kind, end_date);

-- signed contracts stay frozen, except the after-signing bookkeeping fields
create or replace function contracts_block_signed_changes() returns trigger
language plpgsql as $$
begin
  if old.status = 'signed' then
    if tg_op = 'UPDATE'
       and (to_jsonb(new) - 'estamp_ref' - 'pdf_path') = (to_jsonb(old) - 'estamp_ref' - 'pdf_path') then
      return new;
    end if;
    raise exception 'a signed contract cannot be changed or deleted';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

-- templates for the staff kinds (the client template stays in contract_template)
create table if not exists contract_templates (
  kind text primary key check (kind in ('monthly', 'freelance')),
  content jsonb not null,
  updated_at timestamptz not null default now()
);
alter table contract_templates enable row level security;
revoke all on contract_templates from anon, authenticated;

-- what the signer typed when signing (ID card no., address): owner-only
create table if not exists contract_signer_info (
  contract_id uuid primary key references contracts(id) on delete restrict,
  id_no text,
  address text,
  created_at timestamptz not null default now()
);
alter table contract_signer_info enable row level security;
revoke all on contract_signer_info from anon, authenticated;

-- payment vouchers (ใบสำคัญรับเงิน) the payee signs online
create table if not exists contract_payments (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete restrict,
  period text,                                  -- 'YYYY-MM' for monthly contracts
  description text not null default '',
  amount numeric(12, 2) not null,
  withholding numeric(12, 2) not null default 0,
  net numeric(12, 2) not null,
  paid_at date,
  receipt_token uuid not null default gen_random_uuid() unique,
  payee_signer_name text,
  payee_signature_path text,
  payee_signed_at timestamptz,
  payee_sign_ip text,
  transaction_id uuid references transactions(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists contract_payments_contract_idx on contract_payments (contract_id);
alter table contract_payments enable row level security;
revoke all on contract_payments from anon, authenticated;

-- clips handed to an outsource editor count against that batch contract
alter table tasks add column if not exists contract_id uuid references contracts(id) on delete set null;

-- the business that signs: an individual trading under a name, or a company
alter table agency_settings add column if not exists business_type text not null default 'individual';
alter table agency_settings add column if not exists owner_name text;

-- private bucket for signatures and PDF copies (read via signed URLs only)
insert into storage.buckets (id, name, public)
values ('contracts', 'contracts', false)
on conflict (id) do update set public = false;
