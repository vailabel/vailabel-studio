//! The Models module's own Diesel schema for the `ai_models` and
//! `runtime_models` tables (maps to the same physical tables the migrations
//! create).

diesel::table! {
    ai_models (id) {
        id -> Text,
        name -> Text,
        description -> Text,
        version -> Text,
        project_id -> Nullable<Text>,
        model_path -> Text,
        config_path -> Text,
        model_size -> Integer,
        is_custom -> Integer,
        model_type -> Text,
        status -> Text,
        category -> Nullable<Text>,
        is_active -> Integer,
        last_used -> Nullable<Text>,
        backend -> Nullable<Text>,
        framework -> Nullable<Text>,
        labels_path -> Nullable<Text>,
        stride -> Nullable<Integer>,
        family -> Nullable<Text>,
        variant -> Nullable<Text>,
        default_rank -> Nullable<Integer>,
        supports_label_studio_format -> Integer,
        task_type -> Nullable<Text>,
        model_version -> Nullable<Text>,
        metadata_json -> Nullable<Text>,
        created_at -> Text,
        updated_at -> Text,
    }
}

diesel::table! {
    runtime_models (id) {
        id -> Text,
        name -> Text,
        family -> Text,
        version -> Text,
        size -> BigInt,
        download_url -> Nullable<Text>,
        local_path -> Nullable<Text>,
        sha256 -> Nullable<Text>,
        status -> Text,
        capabilities_json -> Nullable<Text>,
        installed_at -> Nullable<Text>,
        created_at -> Text,
        updated_at -> Text,
    }
}
