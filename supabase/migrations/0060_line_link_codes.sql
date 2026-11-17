-- Link a LINE group by typing a code: the owner creates a channel (workspace + what it should
-- receive), gets a one-time code, adds the bot to the group and types the code there; the
-- webhook fills in the group. Until then the channel has no group and sends nothing.
alter table line_channels alter column group_id drop not null;
alter table line_channels add column if not exists link_code text;
alter table line_channels add column if not exists link_expires_at timestamptz;
alter table line_channels add column if not exists linked_at timestamptz;
create unique index if not exists line_channels_link_code_key on line_channels (link_code) where link_code is not null;
