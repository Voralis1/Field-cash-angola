-- ============================================================
--  Field Cash App — Supabase schema
--  Replaces the manual Angola sheet (DAT_TO_DAY_mohamed).
--  All amounts in local currency (AOA for Angola).
--  Country column lets the same app serve future internal-delivery markets.
-- ============================================================

-- ============================================================
--  Reset — drops everything below before recreating it fresh.
--  WARNING: this deletes all existing data in these tables.
-- ============================================================
drop view if exists field_daily_recap;
drop table if exists field_delivery_params cascade;
drop table if exists field_deliveries cascade;
drop table if exists field_agent_days cascade;
drop table if exists field_charges cascade;
drop table if exists field_remittances cascade;

-- ---------- Delivery-cost parameters (editable, never hard-coded) ----------
create table if not exists field_delivery_params (
  id uuid primary key default gen_random_uuid(),
  country text not null unique,                 -- e.g. 'Angola'
  commission_agent   numeric(18,2) not null default 500,   -- per delivery
  commission_manager numeric(18,2) not null default 2000,  -- per delivery
  fuel_per_agent     numeric(18,2) not null default 2000,  -- per agent per day
  currency text not null default 'AOA',
  updated_at timestamptz not null default now()
);

-- ---------- Daily deliveries / collections (one row = one collected order) ----------
create table if not exists field_deliveries (
  id uuid primary key default gen_random_uuid(),
  country text not null default 'Angola',
  delivery_date date not null,                  -- date the cash was collected
  agent text,                                   -- delivery agent name/label
  order_id text,                                -- ID de la commande
  amount_collected numeric(18,2) not null,      -- in local currency
  delivery_fee numeric(18,2) not null default 0,-- fee charged for this delivery (varies per delivery)
  created_at timestamptz not null default now()
);
create index if not exists idx_field_deliveries_date on field_deliveries (country, delivery_date);

-- ---------- Active agents per day (drives fuel + reconciliation) ----------
create table if not exists field_agent_days (
  id uuid primary key default gen_random_uuid(),
  country text not null default 'Angola',
  work_date date not null,
  agents_count int not null default 1,
  created_at timestamptz not null default now(),
  unique (country, work_date)
);

-- ---------- External charges (taxi, saldo, import, internet...) ----------
create table if not exists field_charges (
  id uuid primary key default gen_random_uuid(),
  country text not null default 'Angola',
  charge_date date not null,
  description text,
  category text,
  amount numeric(18,2) not null,                -- in local currency
  created_at timestamptz not null default now()
);
create index if not exists idx_field_charges_date on field_charges (country, charge_date);

-- ---------- Remittances / repatriation (cash sent back to the company) ----------
create table if not exists field_remittances (
  id uuid primary key default gen_random_uuid(),
  country text not null default 'Angola',
  remit_date date not null,
  amount numeric(18,2) not null,                -- in local currency
  method text,                                  -- 'USDT' | 'bank_transfer'
  status text not null default 'sent',          -- 'pending' | 'sent' | 'received'
  created_at timestamptz not null default now()
);
create index if not exists idx_field_remittances_date on field_remittances (country, remit_date);

-- ---------- Platform users (custom credentials store, bcrypt-hashed) ----------
-- NOT part of Supabase Auth. RLS below denies all client access — only the
-- service_role key (server-side / scripts) can read or write this table.
create table if not exists "Angola_field_cash_users" (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,       -- bcrypt hash, never plaintext
  full_name text,
  role text not null default 'field_manager',
  country text not null default 'Angola',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table "Angola_field_cash_users" enable row level security;
-- No policies created on purpose: with RLS enabled and zero policies,
-- anon/authenticated clients get zero rows. Only service_role bypasses RLS.

-- ============================================================
--  Row-Level Security
--  Any authenticated field manager can read/write. Tighten per-country
--  with a profiles table + policies when more than one market is live.
-- ============================================================
alter table field_delivery_params enable row level security;
alter table field_deliveries      enable row level security;
alter table field_agent_days       enable row level security;
alter table field_charges          enable row level security;
alter table field_remittances      enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'field_delivery_params','field_deliveries','field_agent_days',
    'field_charges','field_remittances'
  ]
  loop
    execute format('drop policy if exists "auth read %1$s" on %1$s;', t);
    execute format('drop policy if exists "auth write %1$s" on %1$s;', t);
    execute format('drop policy if exists "auth update %1$s" on %1$s;', t);
    execute format('drop policy if exists "auth delete %1$s" on %1$s;', t);

    execute format(
      'create policy "auth read %1$s"  on %1$s for select to authenticated using (true);', t);
    execute format(
      'create policy "auth write %1$s" on %1$s for insert to authenticated with check (true);', t);
    execute format(
      'create policy "auth update %1$s" on %1$s for update to authenticated using (true);', t);
    execute format(
      'create policy "auth delete %1$s" on %1$s for delete to authenticated using (true);', t);
  end loop;
end $$;

-- ---------- Seed Angola cost parameters (from Mohamed's sheet) ----------
insert into field_delivery_params (country, commission_agent, commission_manager, fuel_per_agent, currency)
values ('Angola', 500, 2000, 2000, 'AOA')
on conflict (country) do nothing;

-- ============================================================
--  Derived view — the "restant" (cash held) and daily recap.
--  Nothing is stored; everything is recomputed to stay honest.
-- ============================================================
create or replace view field_daily_recap as
with deliveries as (
  select country, delivery_date as d,
         sum(amount_collected) as collected,
         count(*) as nb_deliveries,
         sum(delivery_fee) as delivery_fees
  from field_deliveries group by country, delivery_date
),
charges as (
  select country, charge_date as d, sum(amount) as charges
  from field_charges group by country, charge_date
),
remits as (
  select country, remit_date as d, sum(amount) as remitted
  from field_remittances group by country, remit_date
),
agents as (
  select country, work_date as d, agents_count from field_agent_days
),
days as (
  select country, d from deliveries
  union select country, d from charges
  union select country, d from remits
)
select
  days.country,
  days.d as day,
  coalesce(deliveries.collected, 0)            as collected,
  coalesce(deliveries.nb_deliveries, 0)        as nb_deliveries,
  coalesce(agents.agents_count, 1)             as agents_count,
  -- internal delivery cost = sum of the actual delivery_fee entered per delivery (not fixed)
  coalesce(deliveries.delivery_fees, 0)        as internal_delivery_cost,
  coalesce(charges.charges, 0)                 as external_charges,
  coalesce(remits.remitted, 0)                 as remitted
from days
left join deliveries on deliveries.country = days.country and deliveries.d = days.d
left join charges     on charges.country     = days.country and charges.d     = days.d
left join remits      on remits.country      = days.country and remits.d      = days.d
left join agents      on agents.country      = days.country and agents.d      = days.d
order by days.country, days.d;
