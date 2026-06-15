//! The Dataset module's own Diesel schema for the `images` table (maps to the
//! same physical table the residual store creates in `DesktopStore::open`).

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
