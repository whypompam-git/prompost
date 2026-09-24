-- Receipts feed the books: every receipt owns an income transaction, and can
-- point at the invoice it settles.
alter table receipts
  add column if not exists invoice_id uuid references invoices(id) on delete set null;

alter table transactions
  add column if not exists receipt_id uuid unique references receipts(id) on delete cascade;

-- Backfill income for receipts issued before this link existed.
insert into transactions (type, category, amount, description, occurred_at, receipt_id)
select 'income', 'รับชำระค่างาน', r.amount,
       'ใบเสร็จ ' || r.receipt_no, r.created_at::date, r.id
from receipts r
where not exists (select 1 from transactions t where t.receipt_id = r.id);
