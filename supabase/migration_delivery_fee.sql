-- ============================================================
--  Migration — per-delivery "frais de livraison" (delivery fee).
--  Safe to run on an existing database: does not drop any data.
--  Run this instead of schema.sql if you already have live data
--  (schema.sql drops and recreates every table from scratch).
-- ============================================================

alter table field_deliveries
  add column if not exists delivery_fee numeric(18,2) not null default 0;

-- Recompute the daily recap view: internal delivery cost now sums the
-- actual delivery_fee entered per delivery instead of the old fixed
-- (commission_agent + commission_manager) * nb + fuel_per_agent * agents formula.
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
  coalesce(deliveries.delivery_fees, 0)        as internal_delivery_cost,
  coalesce(charges.charges, 0)                 as external_charges,
  coalesce(remits.remitted, 0)                 as remitted
from days
left join deliveries on deliveries.country = days.country and deliveries.d = days.d
left join charges     on charges.country     = days.country and charges.d     = days.d
left join remits      on remits.country      = days.country and remits.d      = days.d
left join agents      on agents.country      = days.country and agents.d      = days.d
order by days.country, days.d;
