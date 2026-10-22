-- วันตัดต่อ: the day the editors work on a clip (planning/assignment). due_date
-- stays "วันส่ง". A queue can carry a default edit date for all its clips.
alter table tasks add column if not exists edit_date date;
alter table queues add column if not exists edit_date date;

-- Clips already past editing (sent to the client, approved, posted, rejected):
-- use their delivery date so nothing looks half-planned.
update tasks set edit_date = due_date
where edit_date is null and type in ('pending', 'approved', 'posted', 'rejected');
