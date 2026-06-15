// Diesel schema — kept in sync with migrations/00000000000001_initial_schema/up.sql

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
    annotations (id) {
        id -> Text,
        image_id -> Text,
        label_id -> Nullable<Text>,
        name -> Text,
        color -> Text,
        annotation_type -> Text,
        coordinates_json -> Text,
        group_id -> Nullable<Integer>,
        flags_json -> Nullable<Text>,
        meta_json -> Nullable<Text>,
        project_id -> Nullable<Text>,
        is_ai_generated -> Integer,
        created_at -> Text,
        updated_at -> Text,
    }
}

diesel::table! {
    history (id) {
        id -> Text,
        project_id -> Nullable<Text>,
        labels_json -> Nullable<Text>,
        history_index -> Integer,
        can_undo -> Integer,
        can_redo -> Integer,
        created_at -> Text,
        updated_at -> Text,
    }
}

diesel::table! {
    images (id) {
        id -> Text,
        project_id -> Text,
        name -> Text,
        path -> Text,
        image_path -> Nullable<Text>,
        width -> Integer,
        height -> Integer,
        flags_json -> Nullable<Text>,
        created_at -> Text,
        updated_at -> Text,
    }
}

diesel::table! {
    labels (id) {
        id -> Text,
        project_id -> Text,
        name -> Text,
        color -> Text,
        category -> Nullable<Text>,
        description -> Nullable<Text>,
        is_ai_generated -> Integer,
        created_at -> Text,
        updated_at -> Text,
    }
}

diesel::table! {
    predictions (id) {
        id -> Text,
        image_id -> Text,
        label_id -> Nullable<Text>,
        label_name -> Nullable<Text>,
        label_color -> Nullable<Text>,
        model_id -> Nullable<Text>,
        name -> Text,
        prediction_type -> Text,
        coordinates_json -> Text,
        confidence -> Double,
        project_id -> Nullable<Text>,
        color -> Nullable<Text>,
        is_ai_generated -> Integer,
        backend -> Nullable<Text>,
        inference_ms -> Nullable<Double>,
        model_version -> Nullable<Text>,
        family -> Nullable<Text>,
        variant -> Nullable<Text>,
        from_name -> Nullable<Text>,
        to_name -> Nullable<Text>,
        result_type -> Nullable<Text>,
        created_at -> Text,
        updated_at -> Text,
    }
}

diesel::table! {
    projects (id) {
        id -> Text,
        name -> Text,
        description -> Nullable<Text>,
        project_type -> Text,
        modality -> Nullable<Text>,
        task -> Nullable<Text>,
        status -> Text,
        settings_json -> Nullable<Text>,
        metadata_json -> Nullable<Text>,
        created_at -> Text,
        updated_at -> Text,
    }
}

diesel::table! {
    secret_keys (id) {
        id -> Text,
        namespace -> Text,
        name -> Text,
    }
}

diesel::table! {
    settings (id) {
        id -> Text,
        key -> Text,
        value -> Text,
        created_at -> Text,
        updated_at -> Text,
    }
}

diesel::table! {
    tasks (id) {
        id -> Text,
        project_id -> Text,
        name -> Text,
        description -> Text,
        assigned_to -> Nullable<Text>,
        status -> Text,
        due_date -> Nullable<Text>,
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

diesel::allow_tables_to_appear_in_same_query!(
    ai_models,
    annotations,
    history,
    images,
    labels,
    predictions,
    projects,
    runtime_models,
    secret_keys,
    settings,
    tasks,
);
