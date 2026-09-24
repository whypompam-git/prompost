-- Owner-configurable task types and status colors (single row).
create table if not exists task_settings (
  id boolean primary key default true,
  types jsonb,
  status_colors jsonb,
  constraint task_settings_singleton check (id)
);

alter table task_settings enable row level security;
create policy "open access - no auth yet" on task_settings for all using (true) with check (true);
