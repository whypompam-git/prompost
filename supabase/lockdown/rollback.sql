-- Undo lock_down.sql: reopens everything the way it was before (any visitor
-- with the anon key can read/write). Use only if the lock-down broke the app
-- and you need it back immediately.
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('drop policy if exists "open access - no auth yet" on public.%I', r.tablename);
    execute format('create policy "open access - no auth yet" on public.%I for all using (true) with check (true)', r.tablename);
  end loop;
end $$;

grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;

create policy "slips open read" on storage.objects for select using (bucket_id = 'slips');
create policy "slips open insert" on storage.objects for insert with check (bucket_id = 'slips');
create policy "client-brand open read" on storage.objects for select using (bucket_id = 'client-brand');
create policy "client-brand open insert" on storage.objects for insert with check (bucket_id = 'client-brand');
create policy "client-brand open delete" on storage.objects for delete using (bucket_id = 'client-brand');
