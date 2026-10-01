-- Reference images for a client's brand brief (logo, mood board, past posts
-- they liked, ...). Stored as an array of public URLs, uploaded to a new
-- "client-brand" bucket, same open pattern as the "slips" bucket.
alter table clients add column if not exists brand_images text[] not null default '{}';

insert into storage.buckets (id, name, public)
values ('client-brand', 'client-brand', true)
on conflict (id) do nothing;

create policy "client-brand open read" on storage.objects for select using (bucket_id = 'client-brand');
create policy "client-brand open insert" on storage.objects for insert with check (bucket_id = 'client-brand');
create policy "client-brand open delete" on storage.objects for delete using (bucket_id = 'client-brand');
