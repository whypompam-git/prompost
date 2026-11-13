-- The editor ticks each draft comment as fixed, separately from the team's
-- "sent to the editor as a brief" (resolved_at).
alter table draft_comments add column if not exists editor_done_at timestamptz;
