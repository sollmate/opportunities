-- ============================================================
-- Provision the backend/agent's managed identity as a least-privilege
-- DB principal in opportunities_poc.
--
-- Identity: system-assigned MI of container app `ca-opportunities-agent-api`
--   objectId (principalId): 5caf5ac7-6487-41fb-bd29-0d8c250b593f
--
-- Run as the Microsoft Entra admin (maurice@sollmate.eu) against
-- the opportunities_poc database.
-- ============================================================

-- NOTE: the Entra-backed role itself is created separately, connected to the
-- `postgres` database (that is where pgaadauth_* functions live and roles are
-- server-wide):
--   SELECT * FROM pg_catalog.pgaadauth_create_principal_with_oid(
--     'ca-opportunities-agent-api',
--     '5caf5ac7-6487-41fb-bd29-0d8c250b593f', 'service', false, false);
-- The grants below run against opportunities_poc.

-- Schema access
GRANT USAGE ON SCHEMA crm, advisory, ref TO "ca-opportunities-agent-api";

-- CRUD on all current tables (no DDL/owner rights)
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA crm, advisory, ref
  TO "ca-opportunities-agent-api";

-- Sequences (e.g. ref.industry identity) for completeness / future serials
GRANT USAGE, SELECT
  ON ALL SEQUENCES IN SCHEMA crm, advisory, ref
  TO "ca-opportunities-agent-api";

-- Auto-grant the same on future objects created by the DDL owner (oppadmin)
ALTER DEFAULT PRIVILEGES FOR ROLE oppadmin IN SCHEMA crm, advisory, ref
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "ca-opportunities-agent-api";
ALTER DEFAULT PRIVILEGES FOR ROLE oppadmin IN SCHEMA crm, advisory, ref
  GRANT USAGE, SELECT ON SEQUENCES TO "ca-opportunities-agent-api";
