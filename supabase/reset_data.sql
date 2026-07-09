-- ============================================================
--  Field Cash App — Reset transactional data only.
--  Keeps: field_delivery_params (commission/fuel config)
--         "Angola_field_cash_users" (login accounts)
--  WARNING: irreversible. Run in Supabase SQL Editor.
-- ============================================================

truncate table field_deliveries, field_charges, field_remittances, field_agent_days;
