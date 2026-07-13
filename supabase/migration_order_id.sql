-- ============================================================
--  Migration — per-delivery "ID de la commande" (order id).
--  Safe to run on an existing database: does not drop any data.
-- ============================================================

alter table field_deliveries
  add column if not exists order_id text;
