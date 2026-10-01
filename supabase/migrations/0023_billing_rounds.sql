-- Each client_packages row is one "billing round" (a package purchase).
-- amount is a snapshot of the package price at assignment time, so later
-- price changes don't retroactively change what a past round billed.
-- receipts link to the round they pay down, so "paid" never accumulates
-- across rounds — a new round starts the client's due amount fresh.
alter table client_packages add column if not exists amount numeric(12, 2) not null default 0;
alter table receipts add column if not exists client_package_id uuid references client_packages(id) on delete set null;
