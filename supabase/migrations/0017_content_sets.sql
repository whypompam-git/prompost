-- Reusable content sets ("Menu"): a named list of clip templates
-- (title / script / ref) that can be stamped onto a client as tasks.
create table if not exists content_sets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table content_sets enable row level security;
create policy "open access - no auth yet" on content_sets for all using (true) with check (true);
