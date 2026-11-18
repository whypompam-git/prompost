-- Gift shop: a small public order page (/gift) with a back office (Sale) in the app.
-- Customer data (name, address, phone, slip) is only reachable through server routes
-- (service role); nothing here is exposed to the browser client / proxy.
create table if not exists shop_settings (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  title text not null default 'Gift',
  intro text not null default '',
  promptpay_id text not null default '',
  line_note text not null default 'LINE HOPS',
  is_open boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists shop_products (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  description text not null default '',
  price numeric(12,2) not null default 0 check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  max_per_person integer not null default 1 check (max_per_person >= 1),
  image_url text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists shop_products_ws_idx on shop_products (workspace_id, sort_order);

create table if not exists shop_orders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  code text not null,
  name text not null,
  phone text not null,
  address text not null,
  note text not null default '',
  total numeric(12,2) not null default 0,
  slip_path text,
  status text not null default 'paid_pending' check (status in ('paid_pending', 'confirmed', 'shipped', 'cancelled')),
  created_at timestamptz not null default now(),
  unique (workspace_id, code)
);
create index if not exists shop_orders_ws_idx on shop_orders (workspace_id, created_at desc);
create index if not exists shop_orders_phone_idx on shop_orders (workspace_id, phone);

create table if not exists shop_order_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  order_id uuid not null references shop_orders(id) on delete cascade,
  product_id uuid references shop_products(id) on delete set null,
  name text not null,
  price numeric(12,2) not null,
  qty integer not null check (qty >= 1)
);
create index if not exists shop_order_items_order_idx on shop_order_items (order_id);

do $$
declare t text;
begin
  foreach t in array array['shop_settings', 'shop_products', 'shop_orders', 'shop_order_items'] loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from anon, authenticated', t);
    execute format('drop trigger if exists %I on %I', t || '_ws_immutable', t);
    execute format('create trigger %I before update on %I for each row execute function ws_immutable()', t || '_ws_immutable', t);
  end loop;
end $$;
drop trigger if exists shop_order_items_ws_parent on shop_order_items;
create trigger shop_order_items_ws_parent before insert or update on shop_order_items
  for each row execute function ws_from_parent('shop_orders', 'order_id');

-- Place an order atomically: lock the products, check stock + the per-person limit (this order
-- plus earlier orders from the same phone), take the stock, price everything from the database.
-- Errors come back as exceptions whose message starts with a code the route understands.
create or replace function shop_place_order(
  p_ws uuid, p_code text, p_name text, p_phone text, p_address text, p_note text, p_slip text, p_items jsonb
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  it jsonb;
  prod shop_products%rowtype;
  q int;
  already int;
  v_total numeric := 0;
  oid uuid;
begin
  if not coalesce((select is_open from shop_settings where workspace_id = p_ws), true) then
    raise exception 'CLOSED';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'EMPTY'; end if;
  insert into shop_orders (workspace_id, code, name, phone, address, note, slip_path)
  values (p_ws, p_code, p_name, p_phone, p_address, p_note, p_slip) returning id into oid;
  -- lock in a stable order so two orders can't deadlock each other
  for it in select value from jsonb_array_elements(p_items) order by value ->> 'id' loop
    q := (it ->> 'qty')::int;
    if q is null or q < 1 then raise exception 'BAD_QTY'; end if;
    select * into prod from shop_products where id = (it ->> 'id')::uuid and workspace_id = p_ws for update;
    if not found or not prod.active then raise exception 'GONE:%', it ->> 'id'; end if;
    if prod.stock < q then raise exception 'STOCK:%', prod.id; end if;
    select coalesce(sum(i.qty), 0) into already
      from shop_order_items i join shop_orders o on o.id = i.order_id
      where o.workspace_id = p_ws and o.phone = p_phone and o.status <> 'cancelled' and o.id <> oid and i.product_id = prod.id;
    if already + q > prod.max_per_person then raise exception 'LIMIT:%', prod.id; end if;
    update shop_products set stock = stock - q where id = prod.id;
    insert into shop_order_items (workspace_id, order_id, product_id, name, price, qty) values (p_ws, oid, prod.id, prod.name, prod.price, q);
    v_total := v_total + prod.price * q;
  end loop;
  update shop_orders set total = v_total where id = oid;
  return jsonb_build_object('id', oid, 'code', p_code, 'total', v_total);
end $$;
revoke all on function shop_place_order(uuid, text, text, text, text, text, text, jsonb) from public, anon, authenticated;

-- Cancel an order and give its stock back (once).
create or replace function shop_cancel_order(p_ws uuid, p_order uuid) returns void language plpgsql security definer set search_path = public as $$
declare st text;
begin
  select status into st from shop_orders where id = p_order and workspace_id = p_ws for update;
  if st is null or st = 'cancelled' then return; end if;
  update shop_products p set stock = p.stock + i.qty from shop_order_items i where i.order_id = p_order and i.product_id = p.id;
  update shop_orders set status = 'cancelled' where id = p_order;
end $$;
revoke all on function shop_cancel_order(uuid, uuid) from public, anon, authenticated;

-- Product pictures are public (shown on the order page); payment slips are private.
insert into storage.buckets (id, name, public) values ('shop-products', 'shop-products', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('shop-slips', 'shop-slips', false) on conflict (id) do nothing;
drop policy if exists "shop-products open read" on storage.objects;
create policy "shop-products open read" on storage.objects for select using (bucket_id = 'shop-products');
