-- Optional start/end time on a task, same idea as Google Calendar's
-- all-day vs timed events — a task with both null still just shows on its
-- date with no specific slot; setting both makes it a timed block for the
-- calendar's Day/Week hourly views.

alter table tasks
  add column if not exists start_time time,
  add column if not exists end_time time;
