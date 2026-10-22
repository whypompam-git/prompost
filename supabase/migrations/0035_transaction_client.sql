-- Link a ledger entry to a client so income can be tied to quotations and receipts.
alter table transactions add column if not exists client_id uuid references clients(id) on delete set null;
create index if not exists transactions_client_idx on transactions (client_id);
