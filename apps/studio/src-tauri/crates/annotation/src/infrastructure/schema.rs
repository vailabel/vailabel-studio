//! The Annotation module's own Diesel schema for the `labels` table (maps to the
//! same physical table the residual store creates in `DesktopStore::open`).

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
