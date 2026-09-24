-- Friendly client links (/gravita), revocable access, English name.
alter table clients
  add column if not exists name_en text,
  add column if not exists slug text unique,
  add column if not exists portal_enabled boolean not null default true;
