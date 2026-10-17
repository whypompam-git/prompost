-- Race-safe, never-reused document numbers. Previously numbers were
-- "count of existing rows + 1", which collides after any delete.
create table if not exists doc_counters (
  kind text not null,
  year int not null,
  last_no int not null default 0,
  primary key (kind, year)
);

alter table doc_counters enable row level security;
drop policy if exists "open access - no auth yet" on doc_counters;
create policy "open access - no auth yet" on doc_counters for all using (true) with check (true);

-- Seed each counter from the highest number already issued per พ.ศ. year.
insert into doc_counters (kind, year, last_no)
select 'quotations', substring(quote_no from 3 for 4)::int, max(substring(quote_no from 8)::int)
from quotations where quote_no ~ '^QT[0-9]{4}-[0-9]+$' group by 1, 2
on conflict (kind, year) do update set last_no = greatest(doc_counters.last_no, excluded.last_no);

insert into doc_counters (kind, year, last_no)
select 'invoices', substring(invoice_no from 3 for 4)::int, max(substring(invoice_no from 8)::int)
from invoices where invoice_no ~ '^IV[0-9]{4}-[0-9]+$' group by 1, 2
on conflict (kind, year) do update set last_no = greatest(doc_counters.last_no, excluded.last_no);

insert into doc_counters (kind, year, last_no)
select 'receipts', substring(receipt_no from 3 for 4)::int, max(substring(receipt_no from 8)::int)
from receipts where receipt_no ~ '^RC[0-9]{4}-[0-9]+$' group by 1, 2
on conflict (kind, year) do update set last_no = greatest(doc_counters.last_no, excluded.last_no);

create or replace function next_doc_no(p_kind text, p_prefix text) returns text
language plpgsql as $$
declare
  y int := extract(year from (now() at time zone 'Asia/Bangkok'))::int + 543;
  n int;
begin
  insert into doc_counters (kind, year, last_no) values (p_kind, y, 1)
  on conflict (kind, year) do update set last_no = doc_counters.last_no + 1
  returning last_no into n;
  return p_prefix || y || '-' || lpad(n::text, 3, '0');
end;
$$;
