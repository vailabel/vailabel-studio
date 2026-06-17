-- SQLite does not support DROP COLUMN in all versions; this migration is
-- effectively non-reversible on SQLite. Removing the file re-creates the DB
-- from the initial schema in development.
SELECT 1;
