-- Complete the image->item generalization: the annotations/predictions foreign
-- key now points at the `items` table (renamed in migration 004), so rename the
-- column to match. FK-safe: no database-level FOREIGN KEY / INDEX / TRIGGER
-- references these columns (all access is typed Diesel), and the values (item
-- ids) are unchanged — only the column name moves.
ALTER TABLE annotations RENAME COLUMN image_id TO item_id;
ALTER TABLE predictions RENAME COLUMN image_id TO item_id;
