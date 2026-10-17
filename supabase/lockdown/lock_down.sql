-- ============================================================================
-- LOCK DOWN THE DATABASE — run by hand, NOT by the migration workflow.
--
-- Only run this AFTER you've confirmed the app works through the /api/sb proxy
-- (browser DevTools → Network: data requests go to /api/sb/..., not to
-- *.supabase.co) and every page you use loads, logged in as owner and as a
-- normal staff member.
--
-- What it does: removes every "open access" policy and the anon role's table
-- privileges, so the public anon key (visible in the website's JavaScript)
-- can no longer read or write ANYTHING. The app keeps working because its
-- server (service-role key) bypasses RLS and the login-checked /api/sb proxy
-- is now the only route to the data.
--
-- To undo: run supabase/lockdown/rollback.sql.
-- ============================================================================

do $$
declare t record;
declare pol record;
begin
  -- every table in public: RLS on
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
  -- drop the wide-open policies
  for pol in select policyname, tablename from pg_policies
             where schemaname = 'public' and policyname like 'open access%' loop
    execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

-- storage: nobody but the server may upload/delete; public buckets still
-- serve existing files by URL (that path doesn't use policies)
drop policy if exists "slips open read" on storage.objects;
drop policy if exists "slips open insert" on storage.objects;
drop policy if exists "client-brand open read" on storage.objects;
drop policy if exists "client-brand open insert" on storage.objects;
drop policy if exists "client-brand open delete" on storage.objects;

-- belt and braces: the anon / authenticated roles get no table privileges
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
