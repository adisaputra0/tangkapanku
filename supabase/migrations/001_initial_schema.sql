-- ============================================================================
-- Migration: 001_initial_schema.sql
-- Deskripsi: Skema awal TangkapanKu (tabel, view, RLS, RPC, dan Storage)
-- ============================================================================

create extension if not exists pg_trgm;

-- ENUM
create type member_role   as enum ('owner', 'staff');
create type txn_type      as enum ('catch', 'advance', 'repayment');
create type input_source  as enum ('manual', 'text', 'voice', 'photo');
create type draft_status  as enum ('pending', 'confirmed', 'rejected');

-- ORGANISASI (satu pengepul/koperasi)
create table organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  location   text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table org_members (
  org_id  uuid references organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role    member_role not null default 'owner',
  primary key (org_id, user_id)
);

-- NELAYAN
create table fishermen (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations(id) on delete cascade,
  name       text not null,
  phone      text,
  boat_name  text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);
create index on fishermen (org_id);
create index fishermen_name_trgm on fishermen using gin (name gin_trgm_ops);

-- DRAF HASIL AI (input mentah + hasil parse)
create table ai_inputs (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  source      input_source not null,
  raw_text    text,
  image_path  text,                 -- path di Storage bucket 'receipts'
  parsed      jsonb,                -- output tervalidasi Zod
  confidence  numeric(3,2),
  status      draft_status not null default 'pending',
  model       text,                 -- nama model AI (transparansi)
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);
create index on ai_inputs (org_id, status);

-- BUKU KAS (ledger tunggal)
create table transactions (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  fisherman_id  uuid not null references fishermen(id) on delete restrict,
  type          txn_type not null,
  species       text,
  weight_kg     numeric(10,2) check (weight_kg is null or weight_kg > 0),
  price_per_kg  numeric(12,2) check (price_per_kg is null or price_per_kg >= 0),
  amount        numeric(14,2) not null check (amount > 0),
  note          text,
  occurred_at   timestamptz not null default now(),
  source        input_source not null default 'manual',
  ai_input_id   uuid references ai_inputs(id),
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now()
);
create index on transactions (org_id, occurred_at desc);
create index on transactions (fisherman_id, occurred_at desc);
create index on transactions (org_id, species, occurred_at);

-- SALDO PER NELAYAN (view)
-- Kasbon beredar = advance - repayment
-- Pendapatan = total catch
create view fisherman_balances with (security_invoker = true) as
select
  f.id as fisherman_id, f.org_id, f.name,
  coalesce(sum(t.amount) filter (where t.type = 'catch'), 0)     as total_catch_value,
  coalesce(sum(t.amount) filter (where t.type = 'advance'), 0)   as total_advance,
  coalesce(sum(t.amount) filter (where t.type = 'repayment'), 0) as total_repayment,
  coalesce(sum(t.amount) filter (where t.type = 'advance'), 0)
    - coalesce(sum(t.amount) filter (where t.type = 'repayment'), 0) as outstanding_advance
from fishermen f
left join transactions t on t.fisherman_id = f.id
group by f.id;

-- LAPORAN HARIAN OTOMATIS
create table daily_reports (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  report_date date not null,
  metrics     jsonb not null,   -- total_kg, total_value, advance_issued, top_species, avg_price per jenis
  narrative   text,             -- ringkasan AI
  model       text,
  created_at  timestamptz not null default now(),
  unique (org_id, report_date)
);

create table anomalies (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  report_date  date not null,
  fisherman_id uuid references fishermen(id) on delete set null,
  kind         text not null,   -- 'price_drop','advance_spike','weight_outlier'
  severity     smallint not null check (severity between 1 and 3),
  detail       jsonb not null,
  created_at   timestamptz not null default now()
);
create index on anomalies (org_id, report_date desc);

-- PROFIL KREDIT NELAYAN
create table credit_profiles (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  fisherman_id uuid not null references fishermen(id) on delete cascade,
  score        smallint not null check (score between 0 and 100),
  factors      jsonb not null,  -- konsistensi setoran, rasio kasbon/pendapatan, riwayat lunas, lama aktif
  narrative    text,
  computed_at  timestamptz not null default now(),
  unique (fisherman_id)
);

-- ============================================================================
-- FUNGSI HELPER & RPC
-- ============================================================================

create function is_org_member(_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from org_members
                 where org_id = _org and user_id = auth.uid());
$$;

create or replace function match_fisherman(_org_id uuid, _query text)
returns table (
  id uuid,
  name text,
  similarity real
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    f.id,
    f.name,
    similarity(lower(f.name), lower(trim(_query))) as similarity
  from fishermen f
  where f.org_id = _org_id
    and f.is_active = true
  order by similarity desc
  limit 3;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table organizations    enable row level security;
alter table org_members      enable row level security;
alter table fishermen        enable row level security;
alter table ai_inputs        enable row level security;
alter table transactions     enable row level security;
alter table daily_reports    enable row level security;
alter table anomalies        enable row level security;
alter table credit_profiles  enable row level security;

create policy org_select on organizations for select using (is_org_member(id));
create policy org_insert on organizations for insert with check (created_by = auth.uid());
create policy mem_select on org_members for select using (user_id = auth.uid());

-- Pola yang sama untuk semua tabel ber-org_id:
create policy fishermen_all on fishermen for all
  using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy ai_inputs_all on ai_inputs for all
  using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy txn_all on transactions for all
  using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy reports_read on daily_reports for select using (is_org_member(org_id));
create policy anomalies_read on anomalies for select using (is_org_member(org_id));
create policy credit_read on credit_profiles for select using (is_org_member(org_id));
-- Insert daily_reports/anomalies/credit_profiles dilakukan server memakai service role key.

-- ============================================================================
-- STORAGE BUCKET & POLICIES ('receipts')
-- ============================================================================

-- 1. Pastikan bucket 'receipts' sudah ada (private bucket)
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- 2. Policy UPLOAD (INSERT): Izinkan anggota org upload ke folder {org_id}/...
create policy "Anggota org bisa upload nota"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] in (
    select org_id::text
    from public.org_members
    where user_id = auth.uid()
  )
);

-- 3. Policy READ (SELECT): Izinkan anggota org melihat/download nota org-nya
create policy "Anggota org bisa melihat nota"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] in (
    select org_id::text
    from public.org_members
    where user_id = auth.uid()
  )
);

-- 4. Policy DELETE (Opsional): Izinkan anggota org menghapus nota org-nya
create policy "Anggota org bisa menghapus nota"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] in (
    select org_id::text
    from public.org_members
    where user_id = auth.uid()
  )
);