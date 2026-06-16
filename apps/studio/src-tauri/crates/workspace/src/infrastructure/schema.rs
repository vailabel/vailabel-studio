//! The Workspace module's own Diesel schema (maps to the same physical tables
//! the migrations create).

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
    secret_keys (id) {
        id -> Text,
        namespace -> Text,
        name -> Text,
    }
}
