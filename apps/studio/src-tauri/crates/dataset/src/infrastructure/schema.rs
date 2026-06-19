//! The Dataset module's own Diesel schema for the `items` table (maps to the
//! same physical table the residual store creates in `DesktopStore::open`).

diesel::table! {
    items (id) {
        id -> Text,
        project_id -> Text,
        name -> Text,
        path -> Text,
        image_path -> Nullable<Text>,
        width -> Integer,
        height -> Integer,
        flags_json -> Nullable<Text>,
        data_json -> Nullable<Text>,
        created_at -> Text,
        updated_at -> Text,
    }
}
