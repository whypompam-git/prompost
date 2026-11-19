-- Waitlist: people from the promo clips who want early access to PromPost. A public page
-- (/waitlist) writes here through a server route (service role); the owner reads and manages
-- them in the app. Nothing here is exposed to the browser client / proxy.
create table if not exists waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  phone text not null,
  line_id text not null default '',
  email text not null default '',
  business_name text not null default '',
  role text not null default 'other',          -- creator | agency | editor | brand | other
  team_size text not null default '',          -- solo | 2-5 | 6-15 | 16+
  client_count text not null default '',       -- 0-3 | 4-10 | 11-30 | 30+
  source text not null default '',             -- tiktok | facebook | instagram | youtube | friend | other
  source_clip text not null default '',        -- which clip / who told them
  interests text[] not null default '{}',      -- features they care about
  message text not null default '',
  consent boolean not null default false,
  utm text not null default '',                -- ?src= on the link
  status text not null default 'new' check (status in ('new', 'contacted', 'invited', 'joined', 'declined')),
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, phone)
);
create index if not exists waitlist_ws_idx on waitlist_signups (workspace_id, created_at);
alter table waitlist_signups enable row level security;
revoke all on waitlist_signups from anon, authenticated;
drop trigger if exists waitlist_signups_ws_immutable on waitlist_signups;
create trigger waitlist_signups_ws_immutable before update on waitlist_signups for each row execute function ws_immutable();
