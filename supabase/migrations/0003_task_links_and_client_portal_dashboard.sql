-- Client portal (src/app/portal/[token]/page.tsx) is growing a real
-- dashboard: clip counts by status, quotations/receipts, and per-task
-- links out to the script (for the client to review/approve) and the
-- final delivered footage — both just Google Drive links pasted in by
-- staff, no file storage of our own needed.

alter table tasks
  add column if not exists script_url text,
  add column if not exists footage_url text;
