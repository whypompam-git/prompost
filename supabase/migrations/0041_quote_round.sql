-- A quotation belongs to a billing round (the client's package for a period), so
-- "billed" can follow the quotation (package + extras) and payments can be matched.
alter table quotations add column if not exists client_package_id uuid references client_packages(id) on delete set null;
-- existing quotations: attach to the client's round that was running when they were made
update quotations q set client_package_id = (
  select cp.id from client_packages cp
  where cp.client_id = q.client_id and cp.assigned_at <= q.created_at
  order by cp.assigned_at desc limit 1
)
where q.client_package_id is null;
