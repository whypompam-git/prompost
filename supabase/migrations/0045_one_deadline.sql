-- One deadline per clip: the edit date (วันตัดต่อ) IS the delivery deadline.
-- Old clips that only had a delivery date get it as their edit date, and from
-- now on due_date simply mirrors edit_date (kept, because it is NOT NULL and
-- older tools still send it; it is no longer shown anywhere).
update tasks set edit_date = due_date where edit_date is null and due_date is not null;

create or replace function tasks_one_deadline() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE'
     and new.due_date is distinct from old.due_date
     and new.edit_date is not distinct from old.edit_date then
    -- something still writing the old field: treat it as the deadline
    new.edit_date := new.due_date;
  elsif new.edit_date is null then
    new.edit_date := new.due_date;
  else
    new.due_date := new.edit_date;
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_one_deadline on tasks;
create trigger tasks_one_deadline
  before insert or update on tasks
  for each row execute function tasks_one_deadline();

update tasks set due_date = edit_date where edit_date is not null and due_date is distinct from edit_date;
