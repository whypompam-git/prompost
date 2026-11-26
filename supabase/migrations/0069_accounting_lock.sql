-- Accounting month lock: a month that is cleared can be locked; changing its transactions then needs
-- the lock code (entering it opens the month for a short time, then it locks again by itself).
-- Enforced in the database (a trigger on transactions), so no screen or API can get around it.
-- Both tables are reachable only through server routes (service role).
create table if not exists accounting_locks (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  locked_at timestamptz not null default now(),
  locked_by uuid,
  unlocked_until timestamptz,
  primary key (workspace_id, month)
);
create table if not exists accounting_lock_settings (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  code_hash text not null,
  updated_at timestamptz not null default now()
);
alter table accounting_locks enable row level security;
alter table accounting_lock_settings enable row level security;
revoke all on accounting_locks from anon, authenticated;
revoke all on accounting_lock_settings from anon, authenticated;

create or replace function accounting_month_guard() returns trigger language plpgsql security definer set search_path = public as $$
declare
  ws uuid;
  d date;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    ws := old.workspace_id; d := old.occurred_at;
    if ws is not null and exists (select 1 from accounting_locks l where l.workspace_id = ws and l.month = to_char(d, 'YYYY-MM') and (l.unlocked_until is null or l.unlocked_until < now())) then
      raise exception 'MONTH_LOCKED:%', to_char(d, 'YYYY-MM');
    end if;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    ws := new.workspace_id; d := new.occurred_at;
    if ws is not null and exists (select 1 from accounting_locks l where l.workspace_id = ws and l.month = to_char(d, 'YYYY-MM') and (l.unlocked_until is null or l.unlocked_until < now())) then
      raise exception 'MONTH_LOCKED:%', to_char(d, 'YYYY-MM');
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

drop trigger if exists transactions_month_guard on transactions;
create trigger transactions_month_guard before insert or update or delete on transactions
  for each row execute function accounting_month_guard();
