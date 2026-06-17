-- Add a typed project configuration column, separate from the old unstructured
-- settings_json blob. config_json holds a JSON-serialized ProjectConfig struct
-- (general / export / ai sections) validated at the application layer.
ALTER TABLE projects ADD COLUMN config_json TEXT;
