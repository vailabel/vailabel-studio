//! The Annotation module's own Diesel schema for the `labels`, `annotations`, and
//! `predictions` tables (maps to the same physical tables the migrations create).

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
    annotations (id) {
        id -> Text,
        item_id -> Text,
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
    predictions (id) {
        id -> Text,
        item_id -> Text,
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
