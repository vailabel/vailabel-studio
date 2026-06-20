-- Mirrors 00000000000002_project_config: SQLite DROP COLUMN support is version
-- dependent, so this migration is treated as non-reversible. The added column is
-- nullable and ignored by older code, so leaving it in place is harmless.
SELECT 1;
