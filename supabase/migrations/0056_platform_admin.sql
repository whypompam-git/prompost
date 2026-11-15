-- The platform owner(s): see every workspace, switch AI / LINE per workspace, delete test
-- workspaces and accounts (/admin). Starts as PromPost's owner account(s).
alter table accounts add column if not exists is_platform_admin boolean not null default false;
update accounts set is_platform_admin = true
where id in (
  select account_id from staff
  where role = 'owner' and is_active and account_id is not null
    and workspace_id = '00000000-0000-4000-8000-000000000001'
);
