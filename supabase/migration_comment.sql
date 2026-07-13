-- ============================================================
--  Migration — per-delivery "commentaire" (comment).
--  Safe to run on an existing database: does not drop any data.
-- ============================================================

alter table field_deliveries
  add column if not exists comment text;
