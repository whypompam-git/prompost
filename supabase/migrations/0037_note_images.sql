-- Pictures attached to client conversation notes (public URLs from storage).
alter table client_notes add column if not exists images text[] not null default '{}';
