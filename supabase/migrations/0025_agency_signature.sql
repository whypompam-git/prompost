-- Uploaded digital signature image, printed above the seller's signature
-- line on quotations / invoices / receipts.
alter table agency_settings add column if not exists signature_url text;
