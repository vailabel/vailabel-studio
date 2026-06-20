-- Inline task data for non-file items (spreadsheet rows). A CSV/TSV/XLSX row is
-- not a file on disk, so it can't ride the `path` reference like an image/audio
-- asset; its column values are stored verbatim as a JSON object here. NULL for
-- every file-backed asset (images, audio clips, text documents) — additive and
-- behavior-preserving for existing rows.
ALTER TABLE images ADD COLUMN data_json TEXT;
