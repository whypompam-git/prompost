-- Phase 4: the client sets a PIN for their client link (prompost.app/<slug>) on first open.
-- Kept apart from clients so the browser data proxy can never read a PIN hash (this table is
-- not reachable through /api/sb); staff viewing from inside the app don't need the PIN.
create table if not exists client_portal_pins (
  client_id uuid primary key references clients(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  pin_hash text not null,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  set_at timestamptz not null default now()
);
alter table client_portal_pins enable row level security;
revoke all on client_portal_pins from anon, authenticated;

drop trigger if exists client_portal_pins_ws_parent on client_portal_pins;
create trigger client_portal_pins_ws_parent before insert or update on client_portal_pins
  for each row execute function ws_from_parent('clients', 'client_id');
drop trigger if exists client_portal_pins_ws_immutable on client_portal_pins;
create trigger client_portal_pins_ws_immutable before update on client_portal_pins
  for each row execute function ws_immutable();
