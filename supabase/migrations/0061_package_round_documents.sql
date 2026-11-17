-- A package purchase (client_packages row = one "round") now holds all of its documents:
--   quotation, invoice and receipt each point at the round; staff can also file files the
--   client sent (PO, slip, signed quote …) under it. Files live in the private "round-files"
--   bucket and are only handed out through a signed link for staff.
alter table invoices add column if not exists client_package_id uuid references client_packages(id) on delete set null;

-- existing invoices join the round that was running when they were made (same rule as quotations in 0041)
update invoices i set client_package_id = (
  select cp.id from client_packages cp
  where cp.client_id = i.client_id and cp.assigned_at <= i.created_at
  order by cp.assigned_at desc limit 1
)
where i.client_package_id is null;
create index if not exists invoices_round_idx on invoices (client_package_id);

create table if not exists round_files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  client_package_id uuid not null references client_packages(id) on delete cascade,
  name text not null,
  path text not null,
  content_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);
create index if not exists round_files_workspace_idx on round_files (workspace_id);
create index if not exists round_files_round_idx on round_files (client_package_id);
alter table round_files enable row level security;
revoke all on round_files from anon, authenticated;

drop trigger if exists round_files_ws_immutable on round_files;
create trigger round_files_ws_immutable before update on round_files for each row execute function ws_immutable();
drop trigger if exists round_files_ws_parent on round_files;
create trigger round_files_ws_parent before insert or update on round_files
  for each row execute function ws_from_parent('client_packages', 'client_package_id', 'clients', 'client_id');

-- every reference stays inside one workspace (rebuild the checks for the two tables that changed)
do $$
declare
  t record;
begin
  for t in
    select c.conrelid::regclass::text as tbl,
           string_agg(format('%L,%L,%L', c.confrelid::regclass::text, a.attname, fa.attname), ',') as pairs
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    join pg_attribute fa on fa.attrelid = c.confrelid and fa.attnum = c.confkey[1]
    where c.contype = 'f'
      and array_length(c.conkey, 1) = 1
      and c.connamespace = 'public'::regnamespace
      and a.attname <> 'workspace_id'
      and c.conrelid::regclass::text in ('invoices', 'round_files')
      and exists (select 1 from information_schema.columns x where x.table_schema = 'public' and x.table_name = c.confrelid::regclass::text and x.column_name = 'workspace_id')
    group by c.conrelid
  loop
    execute format('drop trigger if exists %I on %I', t.tbl || '_ws_refs', t.tbl);
    execute format('create trigger %I before insert or update on %I for each row execute function ws_check_refs(%s)', t.tbl || '_ws_refs', t.tbl, t.pairs);
  end loop;
end $$;

insert into storage.buckets (id, name, public) values ('round-files', 'round-files', false)
on conflict (id) do nothing;
