-- E18: Ziyaret bütünlüğü — sert geofence, denetim kaydı, iptal ve tek açık ziyaret

-- ---------------------------------------------------------------------------
-- 1) cancelled_at kolonu
-- ---------------------------------------------------------------------------
alter table public.visits
  add column if not exists cancelled_at timestamptz;

create index if not exists idx_visits_cancelled_at
  on public.visits (cancelled_at)
  where cancelled_at is not null;

-- ---------------------------------------------------------------------------
-- 2) log_check_in_rejection — append-only denetim yazımı (SECURITY DEFINER)
-- Not: Tetikleyici içinden çağrıldığında aynı işlem içinde raise exception
-- gelirse bu satır da geri alınabilir. Bu yüzden mobil istemci menzil dışı
-- reddi ayrıca bu RPC ile raporlar; tetikleyici içi çağrı ikinci savunma hattıdır.
-- ---------------------------------------------------------------------------
create or replace function public.log_check_in_rejection(
  p_field_rep_id uuid,
  p_customer_id uuid,
  p_location geometry,
  p_distance_m double precision,
  p_is_mock boolean,
  p_reason text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dealership_id uuid;
begin
  if auth.uid() is distinct from p_field_rep_id
     and auth.role() is distinct from 'service_role' then
    raise exception 'Red kaydı yalnızca kendi hesabınız adına yazılabilir';
  end if;

  select dealership_id into v_dealership_id
  from public.users
  where id = p_field_rep_id;

  insert into public.check_in_attempts (
    field_rep_id,
    customer_id,
    dealership_id,
    attempt_location,
    distance_m,
    is_mock_location,
    rejection_reason
  ) values (
    p_field_rep_id,
    p_customer_id,
    v_dealership_id,
    case
      when ST_SRID(p_location) = 0 then ST_SetSRID(p_location, 4326)
      else p_location
    end,
    p_distance_m,
    coalesce(p_is_mock, false),
    coalesce(nullif(trim(p_reason), ''), 'geofence_out_of_range')
  );
end;
$$;

revoke all on function public.log_check_in_rejection(uuid, uuid, geometry, double precision, boolean, text) from public;
grant execute on function public.log_check_in_rejection(uuid, uuid, geometry, double precision, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) visits_before_insert — bayi eşleşmesi, pasif esnaf, sert 100 m geofence
-- ---------------------------------------------------------------------------
create or replace function public.visits_before_insert() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rep_dealership_id uuid;
  v_customer public.customers%rowtype;
  v_distance_m double precision;
  c_geofence_m constant double precision := 100;
begin
  select dealership_id into v_rep_dealership_id
  from public.users
  where id = new.field_rep_id;

  select * into v_customer
  from public.customers
  where id = new.customer_id;

  if not found then
    raise exception 'Esnaf bulunamadı';
  end if;

  if coalesce(v_customer.is_active, false) is not true then
    raise exception 'Pasif esnafa ziyaret başlatılamaz';
  end if;

  if v_customer.location is null then
    raise exception 'Esnafın konum bilgisi eksik';
  end if;

  if v_rep_dealership_id is distinct from v_customer.dealership_id then
    raise exception 'Esnaf başka bir bayie ait; ziyaret başlatılamaz';
  end if;

  v_distance_m := ST_Distance(
    v_customer.location::geography,
    new.check_in_location::geography
  );

  if v_distance_m > c_geofence_m then
    -- Tetikleyici içi log aynı transaction'da geri alınabilir (yukarıdaki not).
    perform public.log_check_in_rejection(
      new.field_rep_id,
      new.customer_id,
      new.check_in_location,
      v_distance_m,
      coalesce(new.is_mock_location, false),
      format('geofence_out_of_range: %.0f m', v_distance_m)
    );
    raise exception
      'Esnafa %s metre uzaktasınız. Ziyaret en fazla 100 metre içinden başlatılabilir.',
      round(v_distance_m)::int;
  end if;

  new.dealership_id := coalesce(new.dealership_id, v_rep_dealership_id, v_customer.dealership_id);
  new.customer_snapshot := coalesce(
    new.customer_snapshot,
    jsonb_build_object(
      'business_name', v_customer.business_name,
      'address', v_customer.address,
      'category_id', v_customer.category_id
    )
  );
  new.check_in_at := now();
  new.synced_at := now();
  new.is_geofence_valid := true;
  new.cancelled_at := null;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) visits_before_update — checkout, immutable alanlar, mock tek yön
-- ---------------------------------------------------------------------------
create or replace function public.visits_before_update() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.check_out_at is not null then
    raise exception 'Kapanmış ziyaret güncellenemez';
  end if;

  -- Değişmez alanları koru
  new.check_in_at := old.check_in_at;
  new.check_in_location := old.check_in_location;
  new.is_geofence_valid := old.is_geofence_valid;
  new.dealership_id := old.dealership_id;
  new.customer_snapshot := old.customer_snapshot;
  new.field_rep_id := old.field_rep_id;
  new.idempotency_key := old.idempotency_key;
  new.customer_id := old.customer_id;

  -- is_mock_location yalnızca false → true olabilir
  if old.is_mock_location then
    new.is_mock_location := true;
  end if;

  -- İptal: cancelled_at set edilmişse kapat
  if new.cancelled_at is not null and old.cancelled_at is null then
    new.cancelled_at := coalesce(new.cancelled_at, now());
    new.check_out_at := coalesce(new.check_out_at, now());
  -- Normal check-out: outcome doluysa konum olsun/olmasın kapat (K-04)
  elsif new.outcome is not null and old.check_out_at is null then
    new.check_out_at := now();
  end if;

  new.synced_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) Yetim açık ziyaretleri kapat, sonra tek açık ziyaret indeksi
-- ---------------------------------------------------------------------------
update public.visits
set
  cancelled_at = coalesce(cancelled_at, now()),
  check_out_at = coalesce(check_out_at, now()),
  synced_at = now()
where check_out_at is null
  and check_in_at < now() - interval '1 day';

-- Aynı temsilcide birden fazla güncel açık ziyaret kaldıysa en eskiyi iptal et
with ranked as (
  select
    id,
    row_number() over (partition by field_rep_id order by check_in_at desc, created_at desc) as rn
  from public.visits
  where check_out_at is null
)
update public.visits v
set
  cancelled_at = coalesce(v.cancelled_at, now()),
  check_out_at = now(),
  synced_at = now()
from ranked r
where v.id = r.id
  and r.rn > 1;

create unique index if not exists visits_one_open_per_rep
  on public.visits (field_rep_id)
  where check_out_at is null;

-- ---------------------------------------------------------------------------
-- 6) cancel_visit RPC
-- ---------------------------------------------------------------------------
create or replace function public.cancel_visit(p_visit_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_visit public.visits%rowtype;
begin
  select * into v_visit
  from public.visits
  where id = p_visit_id
  for update;

  if not found then
    raise exception 'Ziyaret bulunamadı';
  end if;

  if v_visit.field_rep_id is distinct from auth.uid() then
    raise exception 'Bu ziyareti iptal etme yetkiniz yok';
  end if;

  if v_visit.check_out_at is not null then
    raise exception 'Ziyaret zaten kapatılmış';
  end if;

  update public.visits
  set
    cancelled_at = now(),
    check_out_at = now(),
    synced_at = now()
  where id = p_visit_id;
end;
$$;

revoke all on function public.cancel_visit(uuid) from public;
grant execute on function public.cancel_visit(uuid) to authenticated;
