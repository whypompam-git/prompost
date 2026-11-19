-- Staff can edit an order (customer details and items). Stock follows the change atomically:
-- more of a product takes stock (refused if there isn't enough), fewer gives it back.
-- Lines whose product was deleted later (product_id null) are left alone.
create or replace function shop_update_order(
  p_ws uuid, p_order uuid, p_name text, p_phone text, p_address text, p_note text, p_items jsonb
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  o shop_orders%rowtype;
  pid uuid;
  prod shop_products%rowtype;
  old_qty int;
  new_qty int;
  first_id uuid;
  v_total numeric;
begin
  select * into o from shop_orders where id = p_order and workspace_id = p_ws for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if o.status = 'cancelled' then raise exception 'CANCELLED'; end if;
  if jsonb_typeof(p_items) <> 'array' then raise exception 'EMPTY'; end if;

  for pid in
    select x from (
      select product_id as x from shop_order_items where order_id = p_order and product_id is not null
      union
      select (value ->> 'id')::uuid from jsonb_array_elements(p_items)
    ) t order by x
  loop
    select coalesce(sum(qty), 0) into old_qty from shop_order_items where order_id = p_order and product_id = pid;
    select coalesce(sum((value ->> 'qty')::int), 0) into new_qty from jsonb_array_elements(p_items) where (value ->> 'id')::uuid = pid;
    if new_qty < 0 then raise exception 'BAD_QTY'; end if;
    if new_qty = old_qty then continue; end if;

    select * into prod from shop_products where id = pid and workspace_id = p_ws for update;
    if not found then raise exception 'GONE:%', pid; end if;
    if new_qty > old_qty and prod.stock < new_qty - old_qty then raise exception 'STOCK:%', pid; end if;
    update shop_products set stock = stock - (new_qty - old_qty) where id = pid;

    select id into first_id from shop_order_items where order_id = p_order and product_id = pid order by id limit 1;
    if new_qty = 0 then
      delete from shop_order_items where order_id = p_order and product_id = pid;
    elsif first_id is not null then
      update shop_order_items set qty = new_qty where id = first_id;
      delete from shop_order_items where order_id = p_order and product_id = pid and id <> first_id;
    else
      insert into shop_order_items (workspace_id, order_id, product_id, name, price, qty) values (p_ws, p_order, pid, prod.name, prod.price, new_qty);
    end if;
  end loop;

  if not exists (select 1 from shop_order_items where order_id = p_order) then raise exception 'EMPTY'; end if;
  select coalesce(sum(price * qty), 0) into v_total from shop_order_items where order_id = p_order;
  update shop_orders set name = p_name, phone = p_phone, address = p_address, note = p_note, total = v_total where id = p_order;
  return jsonb_build_object('total', v_total);
end $$;
revoke all on function shop_update_order(uuid, uuid, text, text, text, text, jsonb) from public, anon, authenticated;
