-- Manual priority ranking (owner-entered number, lower/higher = you decide
-- the convention) and a free-text brand brief clients/editors can reference.
alter table clients add column if not exists priority int not null default 0;
alter table clients add column if not exists brand_brief text;
