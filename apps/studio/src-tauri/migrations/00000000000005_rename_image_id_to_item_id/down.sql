-- Reverse the FK column rename (plain, FK-safe — see up.sql).
ALTER TABLE annotations RENAME COLUMN item_id TO image_id;
ALTER TABLE predictions RENAME COLUMN item_id TO image_id;
