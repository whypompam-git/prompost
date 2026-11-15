-- Multi-workspace, phase 2: every business row belongs to one workspace.
-- All existing data becomes PromPost's workspace. The app scopes every query by
-- workspace (the /api/sb proxy and the server routes); the database backs it up:
--   * a child row always takes its parent's workspace (a task gets its client's),
--     and refuses a workspace that differs from the parent's
--   * a row can never be moved to another workspace
--   * singleton settings / document counters / numbers become per workspace

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  handle text not null check (handle = lower(handle) and length(handle) between 3 and 30),
  name text not null,
  ai_enabled boolean not null default false,
  line_enabled boolean not null default false,
  join_open boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists workspaces_handle_key on workspaces (handle);
alter table workspaces enable row level security;
revoke all on workspaces from anon, authenticated;

insert into workspaces (id, handle, name, ai_enabled, line_enabled)
values ('00000000-0000-4000-8000-000000000001', 'prompost', 'พร้อมโพส', true, true)
on conflict (id) do nothing;

-- 1. the column, filled with PromPost for everything that exists ───────────────
do $$
declare
  t text;
  tables text[] := array[
    'agency_settings','ai_playbook_versions','ai_playbooks','ai_runs','client_ci','client_context',
    'client_notes','client_packages','clients','content_sets','contract_payments','contract_signer_info',
    'contract_template','contract_templates','contracts','doc_counters','draft_comments','invoices',
    'leave_requests','line_channels','mc_packs','mc_profiles','mc_settings','notes','notifications',
    'packages','payroll_entries','positions','queues','quotations','receipts','staff','staff_goals',
    'task_drafts','task_revisions','task_settings','tasks','teams','transactions'];
begin
  foreach t in array tables loop
    execute format('alter table %I add column if not exists workspace_id uuid references workspaces(id) on delete cascade', t);
    execute format('update %I set workspace_id = %L where workspace_id is null', t, '00000000-0000-4000-8000-000000000001');
    execute format('alter table %I alter column workspace_id set not null', t);
    execute format('create index if not exists %I on %I (workspace_id)', t || '_workspace_idx', t);
  end loop;
end $$;

-- 2. a row never changes workspace ───────────────────────────────────────────
create or replace function ws_immutable() returns trigger language plpgsql as $$
begin
  if new.workspace_id is distinct from old.workspace_id then
    raise exception 'workspace_id cannot change (% → %)', old.workspace_id, new.workspace_id;
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  for t in select unnest(array[
    'agency_settings','ai_playbook_versions','ai_playbooks','ai_runs','client_ci','client_context',
    'client_notes','client_packages','clients','content_sets','contract_payments','contract_signer_info',
    'contract_template','contract_templates','contracts','doc_counters','draft_comments','invoices',
    'leave_requests','line_channels','mc_packs','mc_profiles','mc_settings','notes','notifications',
    'packages','payroll_entries','positions','queues','quotations','receipts','staff','staff_goals',
    'task_drafts','task_revisions','task_settings','tasks','teams','transactions']) loop
    execute format('drop trigger if exists %I on %I', t || '_ws_immutable', t);
    execute format('create trigger %I before update on %I for each row execute function ws_immutable()', t || '_ws_immutable', t);
  end loop;
end $$;

-- 3. children take their parent's workspace ──────────────────────────────────
-- args: pairs of (parent table, column on this row). The first parent that is set
-- decides; a workspace_id that disagrees with it is refused.
create or replace function ws_from_parent() returns trigger language plpgsql as $$
declare
  i int := 0;
  parent_id text;
  parent_ws uuid;
begin
  while i < tg_nargs loop
    parent_id := to_jsonb(new) ->> tg_argv[i + 1];
    if parent_id is not null then
      execute format('select workspace_id from %I where %I::text = $1', tg_argv[i], case when tg_argv[i] = 'ai_playbooks' then 'key' else 'id' end)
        into parent_ws using parent_id;
      if parent_ws is not null then
        if new.workspace_id is not null and new.workspace_id <> parent_ws then
          raise exception 'row belongs to another workspace than its %', tg_argv[i];
        end if;
        new.workspace_id := parent_ws;
        return new;
      end if;
    end if;
    i := i + 2;
  end loop;
  return new;
end $$;

do $$
declare
  spec text[];
  specs text[][] := array[
    array['ai_runs', 'clients,client_id,staff,created_by'],
    array['client_ci', 'clients,client_id'],
    array['client_context', 'clients,client_id'],
    array['client_notes', 'clients,client_id'],
    array['client_packages', 'clients,client_id'],
    array['contracts', 'clients,client_id,staff,staff_id'],
    array['contract_payments', 'contracts,contract_id'],
    array['contract_signer_info', 'contracts,contract_id'],
    array['draft_comments', 'tasks,task_id'],
    array['invoices', 'clients,client_id'],
    array['leave_requests', 'staff,staff_id'],
    array['notes', 'staff,author_id'],
    array['notifications', 'staff,recipient_id'],
    array['payroll_entries', 'staff,staff_id'],
    array['queues', 'clients,client_id'],
    array['quotations', 'clients,client_id'],
    array['receipts', 'clients,client_id'],
    array['staff_goals', 'staff,staff_id'],
    array['task_drafts', 'tasks,task_id'],
    array['task_revisions', 'tasks,task_id'],
    array['tasks', 'clients,client_id'],
    array['transactions', 'clients,client_id,staff,created_by'],
    array['line_channels', 'teams,team_id']
  ];
  args text;
begin
  foreach spec slice 1 in array specs loop
    select string_agg(quote_literal(x), ',') into args from unnest(string_to_array(spec[2], ',')) x;
    execute format('drop trigger if exists %I on %I', spec[1] || '_ws_parent', spec[1]);
    execute format('create trigger %I before insert or update on %I for each row execute function ws_from_parent(%s)', spec[1] || '_ws_parent', spec[1], args);
  end loop;
end $$;

-- 4. singletons and keyed settings become per workspace ───────────────────────
alter table agency_settings drop constraint if exists agency_settings_pkey;
alter table agency_settings add primary key (workspace_id);
alter table mc_settings drop constraint if exists mc_settings_pkey;
alter table mc_settings add primary key (workspace_id);
alter table task_settings drop constraint if exists task_settings_pkey;
alter table task_settings add primary key (workspace_id);
alter table contract_template drop constraint if exists contract_template_pkey;
alter table contract_template add primary key (workspace_id);
alter table contract_templates drop constraint if exists contract_templates_pkey;
alter table contract_templates add primary key (workspace_id, kind);

alter table ai_playbook_versions drop constraint if exists ai_playbook_versions_playbook_key_fkey;
alter table ai_playbooks drop constraint if exists ai_playbooks_pkey;
alter table ai_playbooks add primary key (workspace_id, key);

alter table doc_counters drop constraint if exists doc_counters_pkey;
alter table doc_counters add primary key (workspace_id, kind, year);

-- document numbers repeat across workspaces (each counts from 001)
alter table quotations drop constraint if exists quotations_quote_no_key;
create unique index if not exists quotations_ws_quote_no_key on quotations (workspace_id, quote_no);
alter table receipts drop constraint if exists receipts_receipt_no_key;
create unique index if not exists receipts_ws_receipt_no_key on receipts (workspace_id, receipt_no);
alter table invoices drop constraint if exists invoices_invoice_no_key;
create unique index if not exists invoices_ws_invoice_no_key on invoices (workspace_id, invoice_no);
alter table contracts drop constraint if exists contracts_contract_no_key;
create unique index if not exists contracts_ws_contract_no_key on contracts (workspace_id, contract_no);

-- MC sheet rows are unique per workspace
alter table mc_profiles drop constraint if exists mc_profiles_source_id_key;
create unique index if not exists mc_profiles_ws_source_id_key on mc_profiles (workspace_id, source_id);

drop function if exists next_doc_no(text, text);
create or replace function next_doc_no(p_kind text, p_prefix text, p_workspace uuid) returns text
language plpgsql as $$
declare
  y int := extract(year from (now() at time zone 'Asia/Bangkok'))::int + 543;
  n int;
begin
  insert into doc_counters (workspace_id, kind, year, last_no) values (p_workspace, p_kind, y, 1)
  on conflict (workspace_id, kind, year) do update set last_no = doc_counters.last_no + 1
  returning last_no into n;
  return p_prefix || y || '-' || lpad(n::text, 3, '0');
end $$;
revoke all on function next_doc_no(text, text, uuid) from anon, authenticated;

-- 5. one person may be staff in several workspaces (one row each) ─────────────
drop index if exists staff_account_id_key;
create unique index if not exists staff_account_ws_key on staff (account_id, workspace_id) where account_id is not null;

-- 6. passwords live in accounts now (0052 copied them there): clear the old PIN hashes
--    on staff so a broad select on staff can never return a password hash
update staff set pin_hash = null where pin_hash is not null;
