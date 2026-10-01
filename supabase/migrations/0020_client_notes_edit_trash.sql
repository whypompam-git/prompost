-- Let a note's date be backdated, and soft-delete into a recoverable trash
-- instead of deleting outright.
alter table client_notes add column if not exists note_date date not null default current_date;
alter table client_notes add column if not exists deleted_at timestamptz;
