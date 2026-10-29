#!/bin/bash
# rebuild the demo database from the repo migrations + demo seeds
S=$(dirname "$0")
su postgres -c "psql -q -c 'drop database if exists prompost with (force)' -c 'create database prompost'"
su postgres -c "psql -d prompost -q" <<'SQL'
create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema auth; create table auth.users(id uuid primary key default gen_random_uuid());
create function auth.uid() returns uuid language sql as 'select null::uuid';
create schema storage; create table storage.buckets(id text primary key, name text, public boolean);
create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
SQL
for f in /home/user/prompost/supabase/migrations/*.sql; do su postgres -c "psql -d prompost -v ON_ERROR_STOP=1 -q" < "$f" >/dev/null 2>&1 || { echo "FAIL $f"; exit 1; }; done
for f in seed.sql seed2.sql notif.sql; do su postgres -c "psql -d prompost -v ON_ERROR_STOP=1 -q" < "$S/$f" || exit 1; done
echo reset-ok
