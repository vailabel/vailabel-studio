//! The Training module's own Diesel schema for the `training_jobs` table (maps
//! to the same physical table the residual store creates, until Phase-5 T5 hands
//! ownership here).

diesel::table! {
    training_jobs (id) {
        id -> Text,
        project_id -> Text,
        model_id -> Nullable<Text>,
        name -> Text,
        status -> Text,
        config_json -> Nullable<Text>,
        metrics_json -> Nullable<Text>,
        progress -> Float,
        log_path -> Nullable<Text>,
        error -> Nullable<Text>,
        created_at -> Text,
        updated_at -> Text,
        started_at -> Nullable<Text>,
        finished_at -> Nullable<Text>,
    }
}
