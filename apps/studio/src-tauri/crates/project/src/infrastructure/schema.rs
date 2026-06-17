//! The Project module's own Diesel schema.
//!
//! Each module owns the `table!` for the table(s) it persists. `projects` is the
//! aggregate's table; `images` is declared minimally (read-only) so the
//! repository can compute the derived `imageCount` with a typed grouped query
//! without depending on the dataset module. Both map to the same physical
//! tables the residual store creates in `DesktopStore::open`.

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
        config_json -> Nullable<Text>,
    }
}

diesel::table! {
    images (id) {
        id -> Text,
        project_id -> Text,
    }
}
