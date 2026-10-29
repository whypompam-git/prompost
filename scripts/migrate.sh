#!/usr/bin/env bash
# Applies every supabase/migrations/*.sql not yet recorded in app_migrations,
# in filename order, each in its own transaction. Needs SUPABASE_DB_URL
# (Postgres connection string — use the Supabase "Session pooler" one).
#
# Migrations 0001-0041 were applied by hand (SQL editor) before this runner was
# connected, so on first run they're recorded as applied without being executed
# (re-running some of them would re-apply data fix-ups). From 0042 on, every
# migration runs here, automatically, when it is pushed.
set -euo pipefail

: "${SUPABASE_DB_URL:?SUPABASE_DB_URL is not set}"
PSQL="psql $SUPABASE_DB_URL -v ON_ERROR_STOP=1 -X -q"

$PSQL -c "create table if not exists app_migrations (name text primary key, applied_at timestamptz not null default now());"

if [ "$($PSQL -tA -c 'select count(*) from app_migrations')" = "0" ]; then
  for f in supabase/migrations/00{01..41}_*.sql; do
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
