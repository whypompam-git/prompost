-- category: '' = a normal customer; anything else (พร้อมโพส, Tradetalk, พอม, นุ่น, งานวิ่ง …) = our own
-- work, whose clips skip the client's approval after QC.
-- parent_id: one customer with several businesses — each business is its own client row under the
-- main one; they share one client link PIN and the link shows a switcher between them.
alter table clients add column if not exists category text not null default '';
alter table clients add column if not exists parent_id uuid references clients(id) on delete set null;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'clients_parent_not_self') then
    alter table clients add constraint clients_parent_not_self check (parent_id is null or parent_id <> id);
  end if;
end $$;
create index if not exists clients_parent_idx on clients (parent_id);

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
      and c.conrelid::regclass::text = 'clients'
      and exists (select 1 from information_schema.columns x where x.table_schema = 'public' and x.table_name = c.confrelid::regclass::text and x.column_name = 'workspace_id')
    group by c.conrelid
  loop
    execute format('drop trigger if exists %I on %I', t.tbl || '_ws_refs', t.tbl);
    execute format('create trigger %I before insert or update on %I for each row execute function ws_check_refs(%s)', t.tbl || '_ws_refs', t.tbl, t.pairs);
  end loop;
end $$;
