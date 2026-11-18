-- Gift shop: a LINE link on the success page, and temporary "stock only" links for helpers.
alter table shop_settings add column if not exists line_url text not null default '';

create table if not exists shop_stock_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  token_hash text not null unique,      -- sha256 of the secret in the link (the link itself is shown once)
  label text not null default '',
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists shop_stock_links_ws_idx on shop_stock_links (workspace_id, created_at desc);
alter table shop_stock_links enable row level security;
revoke all on shop_stock_links from anon, authenticated;
drop trigger if exists shop_stock_links_ws_immutable on shop_stock_links;
create trigger shop_stock_links_ws_immutable before update on shop_stock_links for each row execute function ws_immutable();

-- Change a product's stock atomically (a helper adding stock while orders come in must not lose either).
-- p_delta adds / removes; p_set (when not null) replaces. Never below 0. Returns the new stock.
create or replace function shop_adjust_stock(p_ws uuid, p_id uuid, p_delta int, p_set int) returns int
language plpgsql security definer set search_path = public as $$
declare s int;
begin
  update shop_products
     set stock = greatest(0, least(1000000, case when p_set is not null then p_set else stock + coalesce(p_delta, 0) end))
   where id = p_id and workspace_id = p_ws
   returning stock into s;
  return s;
end $$;
revoke all on function shop_adjust_stock(uuid, uuid, int, int) from public, anon, authenticated;
