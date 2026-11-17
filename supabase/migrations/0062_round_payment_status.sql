-- Payment status belongs to each package purchase (round), not to the client as a whole.
-- clients.payment_status stays as a mirror of the NEWEST round so the clients list keeps working.
alter table client_packages add column if not exists payment_status text not null default 'unpaid';

-- newest round of each client takes the client's current status; older rounds are treated as settled
update client_packages cp set payment_status = coalesce(
  (select c.payment_status from clients c where c.id = cp.client_id
     and cp.id = (select id from client_packages x where x.client_id = c.id order by x.assigned_at desc limit 1)),
  'paid'
);
