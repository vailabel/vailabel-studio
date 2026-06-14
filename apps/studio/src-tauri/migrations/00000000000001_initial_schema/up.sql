CREATE TABLE IF NOT EXISTS projects (
    id          TEXT PRIMARY KEY NOT NULL,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    project_type TEXT NOT NULL DEFAULT 'classification',
    status      TEXT NOT NULL DEFAULT 'active',
    settings_json TEXT,
    metadata_json TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS labels (
    id              TEXT PRIMARY KEY NOT NULL,
    project_id      TEXT NOT NULL,
    name            TEXT NOT NULL,
    color           TEXT NOT NULL DEFAULT '#FF0000',
    category        TEXT,
    description     TEXT,
    is_ai_generated INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS images (
    id          TEXT PRIMARY KEY NOT NULL,
    project_id  TEXT NOT NULL,
    name        TEXT NOT NULL,
    path        TEXT NOT NULL,
    image_path  TEXT,
    width       INTEGER NOT NULL DEFAULT 0,
    height      INTEGER NOT NULL DEFAULT 0,
    flags_json  TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
    id          TEXT PRIMARY KEY NOT NULL,
    project_id  TEXT NOT NULL,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    assigned_to TEXT,
    status      TEXT NOT NULL DEFAULT 'todo',
    due_date    TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS annotations (
    id              TEXT PRIMARY KEY NOT NULL,
    image_id        TEXT NOT NULL,
    label_id        TEXT,
    name            TEXT NOT NULL,
    color           TEXT NOT NULL DEFAULT '#FF0000',
    annotation_type TEXT NOT NULL,
    coordinates_json TEXT NOT NULL DEFAULT '[]',
    group_id        INTEGER,
    flags_json      TEXT,
    project_id      TEXT,
    is_ai_generated INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS predictions (
    id              TEXT PRIMARY KEY NOT NULL,
    image_id        TEXT NOT NULL,
    label_id        TEXT,
    label_name      TEXT,
    label_color     TEXT,
    model_id        TEXT,
    name            TEXT NOT NULL DEFAULT '',
    prediction_type TEXT NOT NULL DEFAULT 'box',
    coordinates_json TEXT NOT NULL DEFAULT '[]',
    confidence      REAL NOT NULL DEFAULT 0.0,
    project_id      TEXT,
    color           TEXT,
    is_ai_generated INTEGER NOT NULL DEFAULT 1,
    backend         TEXT,
    inference_ms    REAL,
    model_version   TEXT,
    family          TEXT,
    variant         TEXT,
    from_name       TEXT,
    to_name         TEXT,
    result_type     TEXT,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_models (
    id                          TEXT PRIMARY KEY NOT NULL,
    name                        TEXT NOT NULL,
    description                 TEXT NOT NULL DEFAULT '',
    version                     TEXT NOT NULL DEFAULT '1.0.0',
    project_id                  TEXT,
    model_path                  TEXT NOT NULL DEFAULT '',
    config_path                 TEXT NOT NULL DEFAULT '',
    model_size                  INTEGER NOT NULL DEFAULT 0,
    is_custom                   INTEGER NOT NULL DEFAULT 0,
    model_type                  TEXT NOT NULL DEFAULT 'detection',
    status                      TEXT NOT NULL DEFAULT 'inactive',
    category                    TEXT,
    is_active                   INTEGER NOT NULL DEFAULT 0,
    last_used                   TEXT,
    backend                     TEXT,
    framework                   TEXT,
    labels_path                 TEXT,
    stride                      INTEGER,
    family                      TEXT,
    variant                     TEXT,
    default_rank                INTEGER,
    supports_label_studio_format INTEGER NOT NULL DEFAULT 0,
    task_type                   TEXT,
    model_version               TEXT,
    metadata_json               TEXT,
    created_at                  TEXT NOT NULL,
    updated_at                  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
    id         TEXT PRIMARY KEY NOT NULL,
    key        TEXT NOT NULL UNIQUE,
    value      TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS history (
    id            TEXT PRIMARY KEY NOT NULL,
    project_id    TEXT,
    labels_json   TEXT,
    history_index INTEGER NOT NULL DEFAULT 0,
    can_undo      INTEGER NOT NULL DEFAULT 0,
    can_redo      INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS secret_keys (
    id        TEXT PRIMARY KEY NOT NULL,
    namespace TEXT NOT NULL,
    name      TEXT NOT NULL,
    UNIQUE(namespace, name)
);
