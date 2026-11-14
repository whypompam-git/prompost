-- A personal target on the profile page: e.g. 100 clips per month, or 100 clips
-- counted from a chosen start date. One row per person; read/written only
-- through the server (/api/my/goal).
create table if not exists staff_goals (
  staff_id uuid primary key references staff(id) on delete cascade,
  target integer not null check (target > 0 and target <= 100000),
  mode text not null default 'month' check (mode in ('month', 'from')),
  start_date date,
  updated_at timestamptz not null default now()
);
alter table staff_goals enable row level security;
revoke all on staff_goals from anon, authenticated;
