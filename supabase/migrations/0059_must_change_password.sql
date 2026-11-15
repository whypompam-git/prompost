-- Accounts still on the 4-digit PIN they had before passwords existed must pick a real password
-- (6+ characters) before using the app. "Still on the PIN" = a password that was copied from the
-- PIN in 0052 and never changed since (changing it, or an owner reset, bumps updated_at).
alter table accounts add column if not exists must_change_password boolean not null default false;
update accounts
set must_change_password = true
where password_hash is not null
  and updated_at = created_at
  and created_at < '2026-11-16 12:00:00+07';
