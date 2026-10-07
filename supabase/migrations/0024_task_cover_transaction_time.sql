-- Clip cover image (uploaded to the existing public "client-brand" bucket)
-- and an optional time-of-day for accounting entries (transfer time).
alter table tasks add column if not exists cover_url text;
alter table transactions add column if not exists occurred_time time;
