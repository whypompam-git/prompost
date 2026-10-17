#!/usr/bin/env bash
# Applies every supabase/migrations/*.sql not yet recorded in app_migrations,
# in filename order, each in its own transaction. Needs SUPABASE_DB_URL
# (Postgres connection string — use the Supabase "Session pooler" one).
#
# Migrations 0001-0016 were applied by hand before this runner existed, so
# on first run they're recorded as applied without being executed. Every
# later migration is written to be safe to re-run (if not exists / drop
# policy if exists), so a hand-applied one just re-applies harmlessly.
set -euo pipefail

: "${SUPABASE_DB_URL:?SUPABASE_DB_URL is not set}"
PSQL="psql $SUPABASE_DB_URL -v ON_ERROR_STOP=1 -X -q"

$PSQL -c "create table if not exists app_migrations (name text primary key, applied_at timestamptz not null default now());"

if [ "$($PSQL -tA -c 'select count(*) from app_migrations')" = "0" ]; then
  for f in supabase/migrations/00{01..16}_*.sql; do
    n=$(basename "$f")
    $PSQL -c "insert into app_migrations (name) values ('$n') on conflict do nothing;"
    echo "baseline: $n"
  done
fi

for f in $(ls supabase/migrations/*.sql | sort); do
  n=$(basename "$f")
  done_already=$($PSQL -tA -c "select 1 from app_migrations where name = '$n'")
  if [ "$done_already" = "1" ]; then continue; fi
  echo "applying: $n"
  $PSQL --single-transaction -f "$f" -c "insert into app_migrations (name) values ('$n');"
done
echo "migrations up to date"
