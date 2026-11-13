-- Draft review: editors upload the draft video into the system, the team QCs it
-- in a TikTok-style feed, then the client checks it on their link. Comments can
-- carry the second of the clip they refer to.
create table if not exists task_drafts (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  version int not null default 1,
  path text not null,               -- object path in the private "drafts" bucket
  size_bytes bigint,
  uploaded_by uuid references staff(id) on delete set null,
  created_at timestamptz not null default now(),
  removed_at timestamptz            -- file deleted after delivery to Drive
);
create index if not exists task_drafts_task_idx on task_drafts (task_id, version desc);
alter table task_drafts enable row level security;
revoke all on task_drafts from anon, authenticated;

create table if not exists draft_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  draft_id uuid references task_drafts(id) on delete set null,
  author_staff_id uuid references staff(id) on delete set null,
  from_client boolean not null default false,
  at_seconds numeric(8, 2),
  body text not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists draft_comments_task_idx on draft_comments (task_id, created_at);
alter table draft_comments enable row level security;
revoke all on draft_comments from anon, authenticated;

-- private bucket, up to 500 MB per draft (the project-wide upload limit in
-- Storage settings must also allow this)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('drafts', 'drafts', false, 524288000, array['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
