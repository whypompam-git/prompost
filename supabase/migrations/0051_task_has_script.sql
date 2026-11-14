-- A computed column so list screens can show the "has a script" mark without
-- downloading every script (select=...,has_script).
create or replace function has_script(t tasks) returns boolean
language sql stable as $$ select coalesce(length(btrim(t.script_text)), 0) > 0 $$;
