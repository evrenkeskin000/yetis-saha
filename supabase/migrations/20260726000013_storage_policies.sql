-- E12 / Migration 13: Storage politikalarını yeni rollere güncelle
-- Eski admin/manager referansları düşürülür; bayi bazlı okuma eklenir.

drop policy if exists "visit_photos_bucket_select" on storage.objects;
drop policy if exists "visit_photos_bucket_insert" on storage.objects;
drop policy if exists "visit_photos_bucket_update" on storage.objects;
drop policy if exists "visit_photos_bucket_delete" on storage.objects;

-- Okuma: dosya sahibi | aynı bayideki dealer_admin | Yetiş Admin
create policy "visit_photos_bucket_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'visit-photos' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_yetis_admin()
      or (
        public.current_user_role() = 'dealer_admin'
        and exists (
          select 1 from public.users u
          where u.id::text = (storage.foldername(name))[1]
            and u.dealership_id is not null
            and u.dealership_id = public.auth_user_dealership_id()
        )
      )
    )
  );

-- Yazma: yalnızca aktif kullanıcı, yalnızca kendi klasörü
create policy "visit_photos_bucket_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'visit-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.auth_user_is_active()
  );

create policy "visit_photos_bucket_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'visit-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.auth_user_is_active()
  )
  with check (
    bucket_id = 'visit-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Silme: dosya sahibi veya Yetiş Admin
create policy "visit_photos_bucket_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'visit-photos' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_yetis_admin()
    )
  );
