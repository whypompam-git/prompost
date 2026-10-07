-- The line item name printed on a receipt (e.g. copied from the quotation it
-- settles), instead of the generic "ชำระค่าบริการ".
alter table receipts add column if not exists description text;
