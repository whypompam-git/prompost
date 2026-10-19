-- Teams ("ทีม 1/2/3") that staff belong to; owner can add more in Settings.
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table teams enable row level security;
-- no policies: only the server (service key, via the /api/sb proxy) touches it
revoke all on teams from anon, authenticated;

alter table staff add column if not exists team_id uuid references teams(id) on delete set null;

insert into teams (name, sort_order)
select v.name, v.ord
from (values ('ทีม 1', 1), ('ทีม 2', 2), ('ทีม 3', 3)) as v(name, ord)
where not exists (select 1 from teams);
