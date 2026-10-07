-- Quotations made outside the app (old PDFs / images) can be uploaded and
-- listed alongside generated ones. file_url set = "imported" quotation.
alter table quotations add column if not exists file_url text;
