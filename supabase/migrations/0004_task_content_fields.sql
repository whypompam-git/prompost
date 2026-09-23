-- Task detail is becoming a real content-production record instead of a
-- generic to-do: reference video, content category, an in-app script
-- (typed directly, not a Drive link), shot list / equipment list (free-typed,
-- suggested from past entries client-side), a post date, and a separate
-- "final" delivered link distinct from the raw footage link.

alter table tasks
  add column if not exists ref_link text,
  add column if not exists content_category text,
  add column if not exists script_text text,
  add column if not exists shots text[] not null default '{}',
  add column if not exists equipment text[] not null default '{}',
  add column if not exists post_date date,
  add column if not exists final_url text;
