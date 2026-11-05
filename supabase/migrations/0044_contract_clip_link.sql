-- A clip handed to an outsource editor is counted against that editor's signed
-- batch contract that still has room (oldest first). Works for every path that
-- sets editor_id (task form, AI tools, API) because it runs in the database.
create or replace function tasks_link_freelance_contract() returns trigger
language plpgsql as $$
declare
  target uuid;
begin
  if new.editor_id is null or new.contract_id is not null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.editor_id is not distinct from new.editor_id then
    return new;
  end if;
  select c.id into target
  from contracts c
  where c.kind = 'freelance'
    and c.status = 'signed'
    and c.staff_id = new.editor_id
    and coalesce(c.clip_count, 0) > (select count(*) from tasks t where t.contract_id = c.id)
  order by c.client_signed_at nulls last, c.created_at
  limit 1;
  new.contract_id := target;
  return new;
end;
$$;

drop trigger if exists tasks_link_freelance_contract on tasks;
create trigger tasks_link_freelance_contract
  before insert or update of editor_id on tasks
  for each row execute function tasks_link_freelance_contract();

-- a different editor takes the clip: it no longer counts for the old contract
create or replace function tasks_unlink_on_editor_change() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' and old.editor_id is distinct from new.editor_id and new.contract_id is not null
     and new.contract_id = old.contract_id then
    new.contract_id := null;
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_a_unlink_on_editor_change on tasks;
-- runs before the link trigger (triggers fire in name order)
create trigger tasks_a_unlink_on_editor_change
  before update of editor_id on tasks
  for each row execute function tasks_unlink_on_editor_change();
