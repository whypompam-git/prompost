-- Login + PIN + owner-controlled page permissions.
--
-- pin_hash is never selected by the browser/anon client — every query in
-- src/lib/supabase/queries.ts lists columns explicitly and omits it. PIN
-- verification only ever happens server-side, in the /api/auth/login route,
-- via the service-role admin client.
alter table staff
  add column if not exists pin_hash text,
  add column if not exists role text not null default 'staff' check (role in ('owner', 'staff')),
  add column if not exists can_view_accounting boolean not null default false,
  add column if not exists can_view_hr boolean not null default false;

-- Seed one owner login so there's a way in before any staff accounts exist.
-- Default PIN is 1234 — change it immediately from the staff edit modal
-- once logged in.
insert into staff (name, position, role, can_view_accounting, can_view_hr, avatar_color, pin_hash, base_salary)
select 'เจ้าของร้าน', 'เจ้าของ', 'owner', true, true, 'bg-orange-500',
  '$2b$10$pudKBxsBg.IpOUCbG0EcHezXgwz5XsJ9sfm.Pe6oNu8gizFa8O1ya', 0
where not exists (select 1 from staff where role = 'owner');
