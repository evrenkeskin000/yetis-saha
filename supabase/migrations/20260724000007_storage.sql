-- 07: storage ve politikalar

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('visit-photos', 'visit-photos', false, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage.objects RLS politikaları
create policy "visit_photos_bucket_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'visit-photos' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.current_user_role() in ('admin', 'manager')
    )
  );

create policy "visit_photos_bucket_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'visit-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "visit_photos_bucket_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'visit-photos' and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'visit-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "visit_photos_bucket_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'visit-photos' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.current_user_role() = 'admin'
    )
  );

-- Konum logları KVKK gereği en fazla 6 ay saklanır.
-- pg_cron etkinleştirildikten sonra:
-- select cron.schedule('purge-location-logs', '15 3 * * *', $$select public.purge_old_location_logs()$$);
-- Alternatif ($0): GitHub Actions cron + service role key ile çağrı.
