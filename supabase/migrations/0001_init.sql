-- PromPost (พร้อมโพส) — reference schema sketch for a single media agency's
-- back office. Single-tenant: every table belongs to this one agency, so
-- there is no tenant_id anywhere (unlike a multi-shop SaaS product).
-- Not yet wired to the app — the Dashboard/Calendar pages currently render
-- from src/lib/mock-data.ts. Connect real queries once Supabase env vars
-- are set, then swap the mock imports for supabase-js calls.

create extension if not exists "pgcrypto";

-- ── Staff (module 4: HR & Payroll) ──────────────────────────────────────
create table staff (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id), -- null until the person has a login
  name text not null,
  position text,
  phone text,
  email text,
  hire_date date,
  base_salary numeric(12, 2) default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table leave_requests (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  date_from date not null,
  date_to date not null,
  leave_type text not null default 'personal', -- personal | sick | vacation
  status text not null default 'pending', -- pending | approved | rejected
  note text,
  created_at timestamptz not null default now()
);

create table payroll_entries (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  period_month date not null, -- first day of the paid month
  base_salary numeric(12, 2) not null,
  bonus numeric(12, 2) not null default 0,
  deductions numeric(12, 2) not null default 0,
  net_pay numeric(12, 2) generated always as (base_salary + bonus - deductions) stored,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (staff_id, period_month)
);

-- ── Clients (module 3: Client Management & Portal) ──────────────────────
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  phone text,
  email text,
  payment_status text not null default 'unpaid', -- unpaid | deposit | paid
  color_tag text not null default 'orange', -- calendar column accent
  portal_token uuid not null default gen_random_uuid() unique, -- /portal/:token
  created_at timestamptz not null default now()
);

-- ── Tasks (modules 1 & 2: Dashboard + Calendar) ─────────────────────────
create table tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  title text not null,
  type text not null default 'other', -- shoot | edit | review | deliver | other
  status text not null default 'todo', -- todo | in_progress | review | done
  assignee_id uuid references staff(id),
  scheduled_date date not null, -- drives the Calendar matrix cell
  due_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_scheduled_date_idx on tasks (scheduled_date);
create index tasks_client_id_idx on tasks (client_id);

-- ── Accounting (module 5) ────────────────────────────────────────────────
create table quotations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id),
  quote_no text unique,
  items jsonb not null default '[]', -- [{description, qty, unit_price}]
  vat_percent numeric(5, 2) not null default 7,
  wht_percent numeric(5, 2) not null default 0, -- หัก ณ ที่จ่าย
  subtotal numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  status text not null default 'draft', -- draft | sent | accepted | rejected
  created_at timestamptz not null default now()
);

create table receipts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id),
  quotation_id uuid references quotations(id),
  receipt_no text unique,
  amount numeric(12, 2) not null,
  created_at timestamptz not null default now()
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null, -- income | expense
  category text,
  amount numeric(12, 2) not null,
  description text,
  slip_url text, -- uploaded transfer-slip image
  occurred_at date not null default current_date,
  created_by uuid references staff(id),
  created_at timestamptz not null default now()
);

-- ── RLS sketch ────────────────────────────────────────────────────────
-- Every table above should end up owner/staff-readable only, e.g.:
--   alter table clients enable row level security;
--   create policy "staff can read clients" on clients for select
--     using (auth.uid() in (select user_id from staff where is_active));
-- The public client portal (src/app/portal/[token]/page.tsx) should NOT go
-- through client-side RLS at all — same pattern as hops's own customer
-- booking link: serve it from a service-role Edge Function keyed on
-- portal_token, so an anonymous visitor never needs a Supabase session.
