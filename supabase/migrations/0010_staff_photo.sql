-- Profile photo, stored as a data URL tied to the staff account instead of
-- localStorage — so it's consistent across devices and doesn't disappear
-- when a browser's storage is cleared.
alter table staff
  add column if not exists photo_url text;
