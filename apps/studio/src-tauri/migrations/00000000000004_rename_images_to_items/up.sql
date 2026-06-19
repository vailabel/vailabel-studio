-- Generalize the labelable-entity table from the image-only name `images` to the
-- modality-neutral `items` (the table holds images, text docs, audio clips,
-- video, and tabular rows alike). FK-safe: no database-level FOREIGN KEY / INDEX
-- / TRIGGER references this table (all access is typed Diesel), so a plain rename
-- preserves every existing row. The `annotations.image_id` / `predictions.image_id`
-- columns still hold item ids and are renamed to `item_id` in migration 005.
ALTER TABLE images RENAME TO items;
