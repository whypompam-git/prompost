-- Staff member responsible for the client ("คนดูแล").
alter table clients add column if not exists manager_id uuid references staff(id) on delete set null;
