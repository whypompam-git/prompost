-- Contracts with online signing. The template is a single editable row;
-- each contract copies it (variables filled in) so later template edits
-- never change an existing contract. Once signed a contract is immutable
-- (enforced by trigger, not just the UI).
create table if not exists contract_template (
  id boolean primary key default true check (id),
  content jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists contracts (
  id uuid primary key default gen_random_uuid(),
  contract_no text not null unique,
  client_id uuid not null references clients(id) on delete restrict,
  status text not null default 'draft', -- draft | sent | signed
  title text not null,
  sign_date date not null default current_date,
  start_date date,
  end_date date,
  package_name text,
  total_amount numeric(12, 2) not null default 0,
  installments jsonb not null default '[]'::jsonb, -- [{label, percent, amount, due}]
  parties jsonb not null default '{}'::jsonb,       -- snapshot of seller + client details
  intro text not null default '',
  clauses jsonb not null default '[]'::jsonb,       -- [{heading, body}]
  closing text not null default '',
  share_token uuid not null default gen_random_uuid() unique,
  seller_signature_url text,
  client_signer_name text,
  client_signature_url text,
  client_signed_at timestamptz,
  client_sign_ip text,
  client_sign_ua text,
  content_hash text,
  created_at timestamptz not null default now()
);

alter table contract_template enable row level security;
alter table contracts enable row level security;
drop policy if exists "open access - no auth yet" on contract_template;
create policy "open access - no auth yet" on contract_template for all using (true) with check (true);
drop policy if exists "open access - no auth yet" on contracts;
create policy "open access - no auth yet" on contracts for all using (true) with check (true);

create or replace function contracts_block_signed_changes() returns trigger
language plpgsql as $$
begin
  if old.status = 'signed' then
    raise exception 'a signed contract cannot be changed or deleted';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists contracts_immutable_when_signed on contracts;
create trigger contracts_immutable_when_signed
  before update or delete on contracts
  for each row execute function contracts_block_signed_changes();
