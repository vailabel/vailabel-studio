//! The Video module's own Diesel schema for the JSON-blob `videos` / `tracks`
//! tables (maps to the same physical tables the migrations create). The full
//! video/track shape is serialized into `video_json` / `track_json`; the typed
//! columns are just the indexed keys used for lookups.

diesel::table! {
    videos (id) {
        id -> Text,
        project_id -> Text,
        created_at -> Text,
        updated_at -> Text,
        video_json -> Text,
    }
}

diesel::table! {
    tracks (id) {
        id -> Text,
        video_id -> Text,
        project_id -> Text,
        created_at -> Text,
        updated_at -> Text,
        track_json -> Text,
    }
}
