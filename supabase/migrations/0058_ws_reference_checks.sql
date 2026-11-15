-- Every reference between business tables must stay inside one workspace — not only a row's
-- parent (0053) but every other link too (a task's assignee, a receipt's quotation, …).
-- Otherwise a row could point at another workspace's row and an embedded read through the
-- data proxy would show it. Built from the catalog: every single-column foreign key from a
-- table with workspace_id to another table with workspace_id.
create or replace function ws_check_refs() returns trigger language plpgsql as $$
declare
  i int := 0;
  ref_val text;
  ref_ws uuid;
begin
  while i < tg_nargs loop
    -- args: referenced table, column on this row, referenced column
    ref_val := to_jsonb(new) ->> tg_argv[i + 1];
    if ref_val is not null then
      execute format('select workspace_id from %I where %I::text = $1', tg_argv[i], tg_argv[i + 2]) into ref_ws using ref_val;
      if ref_ws is not null and ref_ws <> new.workspace_id then
        raise exception '%.% points at a row in another workspace', tg_table_name, tg_argv[i + 1];
      end if;
    end if;
    i := i + 3;
  end loop;
  return new;
end $$;

do $$
declare
  t record;
  args text;
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
      and exists (select 1 from information_schema.columns x where x.table_schema = 'public' and x.table_name = c.conrelid::regclass::text and x.column_name = 'workspace_id')
      and exists (select 1 from information_schema.columns x where x.table_schema = 'public' and x.table_name = c.confrelid::regclass::text and x.column_name = 'workspace_id')
    group by c.conrelid
  loop
    execute format('drop trigger if exists %I on %I', t.tbl || '_ws_refs', t.tbl);
    execute format('create trigger %I before insert or update on %I for each row execute function ws_check_refs(%s)', t.tbl || '_ws_refs', t.tbl, t.pairs);
  end loop;
end $$;
