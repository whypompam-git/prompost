-- Supabase enables RLS by default on every new table with zero policies,
-- which silently blocks the anon/publishable key from reading or writing
-- anything (confirmed empirically: secret key saw all rows, publishable
-- key saw none). This app has no auth/login system yet — every page is a
-- single internal team's tool with no per-user identity to scope rows to —
-- so for now every table is fully open to anon + authenticated.
--
-- TODO once real staff accounts/auth exist: replace these blanket policies
-- with real ones scoped to auth.uid()/a staff table, the way hops's own
-- has_permission()-style RLS does. Don't leave this open once there's
-- an actual login system, since anyone with the publishable key could
-- currently read/write every row.

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'clients', 'staff', 'tasks', 'leave_requests', 'payroll_entries',
      'quotations', 'receipts', 'transactions'
    ])
  loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy "open access - no auth yet" on %I for all using (true) with check (true)',
      t
    );
  end loop;
end $$;
