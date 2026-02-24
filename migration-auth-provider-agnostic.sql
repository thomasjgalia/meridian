-- ============================================================
-- MIGRATION: Provider-agnostic auth
--
-- Fixes Google OAuth crash (tenant_id was NOT NULL, Google users
-- have no tenant).  Also renames azure_oid → external_id and
-- adds identity_provider so we know which OAuth provider was used.
--
-- Run once against the Azure SQL database.
-- Safe to run on an empty or populated users table.
-- ============================================================

-- 1. Fix the crash: Google users have no tenant ID
ALTER TABLE users ALTER COLUMN tenant_id NVARCHAR(100) NULL;

-- 2. Track which OAuth provider authenticated the user
ALTER TABLE users ADD identity_provider NVARCHAR(50) NULL;

-- 3. Mark any existing rows as AAD (they were created before this migration)
UPDATE users SET identity_provider = 'aad' WHERE identity_provider IS NULL;

-- 4. Rename azure_oid → external_id
--    Works for both Google (sub claim) and AAD (objectidentifier).
--    sp_rename preserves the unique constraint on the column.
EXEC sp_rename 'users.azure_oid', 'external_id', 'COLUMN';
