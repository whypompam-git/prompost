-- Positions can be locked to "my work only" (outsourced editors): the app shows
-- them a single page with just their own clips, served by /api/my/* endpoints.
alter table positions add column if not exists own_only boolean not null default false;
