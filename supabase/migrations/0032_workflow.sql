-- New content pipeline: tasks.type = stage (plan / shoot / edit / qc / pending /
-- approved / posted / rejected / other), tasks.status = sub-status inside it.
-- Also: who shot a clip, revision tracking, per-person notifications, and who
-- talked to the client in a note. The old-data remap runs exactly once (guarded
-- by whether revision_count already exists), so re-running this file is safe.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tasks' and column_name = 'revision_count'
  ) then
    alter table tasks add column revision_count int not null default 0;

    -- old pair -> new pipeline (mirrors legacyToStage in src/lib/workflow.ts)
    update tasks set type = 'posted', status = 'done' where type = 'deliver';
    update tasks set type = 'qc', status = 'review' where type = 'edit' and status = 'done';
    update tasks set status = 'todo' where type = 'edit' and status = 'in_progress';
    update tasks set type = 'pending', status = 'waiting' where type = 'review' and status = 'done';
    update tasks set type = 'qc', status = 'review' where type = 'review';
    update tasks set type = 'edit', status = 'todo'
      where type = 'shoot' and (status = 'review' or (status = 'done' and coalesce(trim(footage_url), '') <> ''));
    update tasks set status = 'todo' where type = 'shoot' and status = 'in_progress';
  end if;
end $$;

alter table tasks add column if not exists shot_by uuid references staff(id) on delete set null;
alter table tasks add column if not exists shot_team_id uuid references teams(id) on delete set null;
alter table tasks add column if not exists revision_brief text;

-- every revision round, kept for the history
create table if not exists task_revisions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  round int not null,
  brief text not null,
  source text not null check (source in ('client', 'qc')),
  created_at timestamptz not null default now()
);
create index if not exists task_revisions_task_idx on task_revisions (task_id, round);
alter table task_revisions enable row level security;
revoke all on task_revisions from anon, authenticated;

-- per-person inbox
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references staff(id) on delete cascade,
  kind text not null,
  task_id uuid references tasks(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  title text not null,
  body text,
  count int not null default 1,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists notifications_inbox_idx on notifications (recipient_id, read_at, created_at desc);
alter table notifications enable row level security;
revoke all on notifications from anon, authenticated;

-- who talked with the client
alter table client_notes add column if not exists talked_by uuid references staff(id) on delete set null;

-- stage list shown in the settings screens (colors stay configurable)
insert into task_settings (id, types, status_colors)
values (true, '[]'::jsonb, null)
on conflict (id) do nothing;
update task_settings set types = '[
  {"key":"plan","label":"Plan","color":"violet"},
  {"key":"shoot","label":"ถ่ายทำ","color":"sky"},
  {"key":"edit","label":"ตัดต่อ","color":"orange"},
  {"key":"qc","label":"QC","color":"amber"},
  {"key":"pending","label":"Pending","color":"rose"},
  {"key":"approved","label":"ผ่าน","color":"emerald"},
  {"key":"posted","label":"Post","color":"teal"},
  {"key":"rejected","label":"ไม่ใช้","color":"gray"},
  {"key":"other","label":"อื่นๆ","color":"gray"}
]'::jsonb
where id = true and not (types @> '[{"key":"qc"}]'::jsonb);
