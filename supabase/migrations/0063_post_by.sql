-- Who posts a clip: our team ('us') or the client ('client'). post_date (already there) is the
-- date it is / will be posted, so it can be set ahead of time from either side.
alter table tasks add column if not exists post_by text not null default 'us';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tasks_post_by_check') then
    alter table tasks add constraint tasks_post_by_check check (post_by in ('us', 'client'));
  end if;
end $$;
