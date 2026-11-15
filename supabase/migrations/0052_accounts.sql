-- Username + password accounts (phase 1 of multi-workspace).
-- An account is a person's login; a staff row is that person's membership in a
-- workspace (role, permissions, pay). Existing staff each get an account whose
-- username is their name squeezed to one word, and whose password is their
-- current PIN (the existing bcrypt hash is reused, so nobody's PIN is ever seen).
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null check (username = lower(username) and length(username) between 2 and 30),
  password_hash text,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists accounts_username_key on accounts (username);
alter table accounts enable row level security;
revoke all on accounts from anon, authenticated;

alter table staff add column if not exists account_id uuid references accounts(id) on delete set null;
create unique index if not exists staff_account_id_key on staff (account_id) where account_id is not null;

do $$
declare
  r record;
  base text;
  cand text;
  n int;
  new_id uuid;
begin
  for r in select id, name, pin_hash from staff where account_id is null order by created_at loop
    base := left(lower(regexp_replace(coalesce(r.name, ''), '[^a-zA-Z0-9ก-๙]', '', 'g')), 24);
    if length(base) < 2 then base := 'user'; end if;
    cand := base;
    n := 1;
    while exists (select 1 from accounts where username = cand) loop
      n := n + 1;
      cand := base || n;
    end loop;
    insert into accounts (username, password_hash) values (cand, r.pin_hash) returning id into new_id;
    update staff set account_id = new_id where id = r.id;
  end loop;
end $$;
