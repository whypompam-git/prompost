-- Positions (picked from a managed list), a separate Editor per clip, and the
-- difficulty of editing a clip (hidden from positions flagged hide_internal,
-- e.g. outsourced editors — enforced in the /api/sb proxy).
create table if not exists positions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0,
  hide_internal boolean not null default false,
  created_at timestamptz not null default now()
);
alter table positions enable row level security;
revoke all on positions from anon, authenticated;

alter table staff add column if not exists position_id uuid references positions(id) on delete set null;

-- one position per distinct title staff already have
insert into positions (name, sort_order)
select p.position, row_number() over (order by p.position)
from (select distinct trim(position) as position from staff where coalesce(trim(position), '') <> '') p
where not exists (select 1 from positions);
update staff s set position_id = p.id from positions p where p.name = trim(s.position) and s.position_id is null;

alter table tasks add column if not exists editor_id uuid references staff(id) on delete set null;
alter table tasks add column if not exists edit_difficulty smallint check (edit_difficulty between 1 and 5);

-- clips already past editing: the editor is the responsible person (else the client's manager)
update tasks t set editor_id = coalesce(t.assignee_id, c.manager_id)
from clients c
where c.id = t.client_id and t.editor_id is null and t.type in ('pending', 'approved', 'posted', 'rejected');
