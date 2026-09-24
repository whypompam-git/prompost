-- Owner-configurable per-staff permissions (see src/lib/permissions.ts).
alter table staff add column if not exists permissions jsonb not null default '{}';

-- Carry over the old single "accounting" checkbox.
update staff
set permissions = jsonb_build_object(
  'accounting', true, 'documents', true, 'financialTotals', true
)
where can_view_accounting and permissions = '{}'::jsonb;
