use crate::schema;
use chrono::Utc;
use diesel::prelude::*;
use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};
use serde_json::{json, Value};
use std::cell::RefCell;
use std::path::PathBuf;
use std::sync::{Arc, Mutex, MutexGuard};
use uuid::Uuid;

pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!("migrations");

// ── Error ────────────────────────────────────────────────────────────────────

#[derive(Debug, thiserror::Error)]
pub enum StoreError {
    #[error("Database error: {0}")]
    Diesel(#[from] diesel::result::Error),
    #[error("Connection error: {0}")]
    Connection(#[from] diesel::ConnectionError),
    #[error("Migration error: {0}")]
    Migration(String),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("Store is unavailable")]
    Unavailable,
}

// ── EntityStore trait ─────────────────────────────────────────────────────────

pub trait EntityStore: Send + Sync {
    fn upsert_entity(&self, kind: &str, value: Value) -> Result<Value, StoreError>;
    fn get_entity(&self, kind: &str, id: &str) -> Result<Option<Value>, StoreError>;
    fn list_entities(&self, kind: &str) -> Result<Vec<Value>, StoreError>;
    fn list_by_field(
        &self,
        kind: &str,
        field: &str,
        value: &str,
    ) -> Result<Vec<Value>, StoreError>;
    fn delete_entity(&self, kind: &str, id: &str) -> Result<(), StoreError>;
}

// ── Row structs (Queryable + Insertable) ──────────────────────────────────────

#[derive(Queryable, Selectable, Insertable, Debug, Clone)]
#[diesel(table_name = schema::projects)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
struct ProjectRow {
    id: String,
    name: String,
    description: Option<String>,
    project_type: String,
    status: String,
    settings_json: Option<String>,
    metadata_json: Option<String>,
    created_at: String,
    updated_at: String,
}

#[derive(Queryable, Selectable, Insertable, Debug, Clone)]
#[diesel(table_name = schema::labels)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
struct LabelRow {
    id: String,
    project_id: String,
    name: String,
    color: String,
    category: Option<String>,
    description: Option<String>,
    is_ai_generated: i32,
    created_at: String,
    updated_at: String,
}

#[derive(Queryable, Selectable, Insertable, Debug, Clone)]
#[diesel(table_name = schema::images)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
struct ImageRow {
    id: String,
    project_id: String,
    name: String,
    path: String,
    image_path: Option<String>,
    width: i32,
    height: i32,
    flags_json: Option<String>,
    created_at: String,
    updated_at: String,
}

#[derive(Queryable, Selectable, Insertable, Debug, Clone)]
#[diesel(table_name = schema::tasks)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
struct TaskRow {
    id: String,
    project_id: String,
    name: String,
    description: String,
    assigned_to: Option<String>,
    status: String,
    due_date: Option<String>,
    created_at: String,
    updated_at: String,
}

#[derive(Queryable, Selectable, Insertable, Debug, Clone)]
#[diesel(table_name = schema::annotations)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
struct AnnotationRow {
    id: String,
    image_id: String,
    label_id: Option<String>,
    name: String,
    color: String,
    annotation_type: String,
    coordinates_json: String,
    group_id: Option<i32>,
    flags_json: Option<String>,
    project_id: Option<String>,
    is_ai_generated: i32,
    created_at: String,
    updated_at: String,
}

#[derive(Queryable, Selectable, Insertable, Debug, Clone)]
#[diesel(table_name = schema::predictions)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
struct PredictionRow {
    id: String,
    image_id: String,
    label_id: Option<String>,
    label_name: Option<String>,
    label_color: Option<String>,
    model_id: Option<String>,
    name: String,
    prediction_type: String,
    coordinates_json: String,
    confidence: f64,
    project_id: Option<String>,
    color: Option<String>,
    is_ai_generated: i32,
    backend: Option<String>,
    inference_ms: Option<f64>,
    model_version: Option<String>,
    family: Option<String>,
    variant: Option<String>,
    from_name: Option<String>,
    to_name: Option<String>,
    result_type: Option<String>,
    created_at: String,
    updated_at: String,
}

#[derive(Queryable, Selectable, Insertable, Debug, Clone)]
#[diesel(table_name = schema::ai_models)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
struct AiModelRow {
    id: String,
    name: String,
    description: String,
    version: String,
    project_id: Option<String>,
    model_path: String,
    config_path: String,
    model_size: i32,
    is_custom: i32,
    model_type: String,
    status: String,
    category: Option<String>,
    is_active: i32,
    last_used: Option<String>,
    backend: Option<String>,
    framework: Option<String>,
    labels_path: Option<String>,
    stride: Option<i32>,
    family: Option<String>,
    variant: Option<String>,
    default_rank: Option<i32>,
    supports_label_studio_format: i32,
    task_type: Option<String>,
    model_version: Option<String>,
    metadata_json: Option<String>,
    created_at: String,
    updated_at: String,
}

#[derive(Queryable, Selectable, Insertable, Debug, Clone)]
#[diesel(table_name = schema::settings)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
struct SettingRow {
    id: String,
    key: String,
    value: String,
    created_at: String,
    updated_at: String,
}

#[derive(Queryable, Selectable, Insertable, Debug, Clone)]
#[diesel(table_name = schema::history)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
struct HistoryRow {
    id: String,
    project_id: Option<String>,
    labels_json: Option<String>,
    history_index: i32,
    can_undo: i32,
    can_redo: i32,
    created_at: String,
    updated_at: String,
}

#[derive(Queryable, Selectable, Insertable, Debug, Clone)]
#[diesel(table_name = schema::secret_keys)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
struct SecretKeyRow {
    id: String,
    namespace: String,
    name: String,
}

// ── JSON helpers ──────────────────────────────────────────────────────────────

fn now_iso() -> String {
    Utc::now().to_rfc3339()
}

fn new_id() -> String {
    Uuid::new_v4().to_string()
}

fn str_val<'a>(v: &'a Value, snake: &str, camel: &str) -> Option<&'a str> {
    v.get(snake)
        .and_then(Value::as_str)
        .or_else(|| v.get(camel).and_then(Value::as_str))
}

fn str_owned(v: &Value, snake: &str, camel: &str) -> String {
    str_val(v, snake, camel).unwrap_or("").to_owned()
}

fn opt_str(v: &Value, snake: &str, camel: &str) -> Option<String> {
    str_val(v, snake, camel).map(str::to_owned)
}

fn bool_val(v: &Value, snake: &str, camel: &str) -> bool {
    v.get(snake)
        .and_then(Value::as_bool)
        .or_else(|| v.get(camel).and_then(Value::as_bool))
        .unwrap_or(false)
}

fn i32_val(v: &Value, snake: &str, camel: &str) -> i32 {
    v.get(snake)
        .and_then(Value::as_i64)
        .or_else(|| v.get(camel).and_then(Value::as_i64))
        .map(|n| n as i32)
        .unwrap_or(0)
}

fn opt_i32(v: &Value, snake: &str, camel: &str) -> Option<i32> {
    v.get(snake)
        .and_then(Value::as_i64)
        .or_else(|| v.get(camel).and_then(Value::as_i64))
        .map(|n| n as i32)
}

fn f64_val(v: &Value, snake: &str, camel: &str) -> f64 {
    v.get(snake)
        .and_then(Value::as_f64)
        .or_else(|| v.get(camel).and_then(Value::as_f64))
        .unwrap_or(0.0)
}

fn opt_f64(v: &Value, snake: &str, camel: &str) -> Option<f64> {
    v.get(snake)
        .and_then(Value::as_f64)
        .or_else(|| v.get(camel).and_then(Value::as_f64))
}

fn get_id(v: &Value) -> String {
    v.get("id")
        .and_then(Value::as_str)
        .filter(|s| !s.is_empty())
        .map(str::to_owned)
        .unwrap_or_else(new_id)
}

fn json_field(v: &Value, key: &str) -> Option<String> {
    v.get(key)
        .filter(|val| !val.is_null())
        .map(|val| val.to_string())
}

fn parse_json_field(s: Option<&str>) -> Value {
    s.and_then(|s| serde_json::from_str(s).ok())
        .unwrap_or(Value::Null)
}

// ── Row → JSON converters ─────────────────────────────────────────────────────

fn project_to_json(r: ProjectRow) -> Value {
    json!({
        "id": r.id,
        "name": r.name,
        "description": r.description,
        "type": r.project_type,
        "project_type": r.project_type,
        "status": r.status,
        "settings": parse_json_field(r.settings_json.as_deref()),
        "metadata": parse_json_field(r.metadata_json.as_deref()),
        "createdAt": r.created_at,
        "created_at": r.created_at,
        "updatedAt": r.updated_at,
        "updated_at": r.updated_at,
    })
}

fn label_to_json(r: LabelRow) -> Value {
    json!({
        "id": r.id,
        "projectId": r.project_id,
        "project_id": r.project_id,
        "name": r.name,
        "color": r.color,
        "category": r.category,
        "description": r.description,
        "isAIGenerated": r.is_ai_generated != 0,
        "is_ai_generated": r.is_ai_generated != 0,
        "createdAt": r.created_at,
        "created_at": r.created_at,
        "updatedAt": r.updated_at,
        "updated_at": r.updated_at,
    })
}

fn image_to_json(r: ImageRow) -> Value {
    json!({
        "id": r.id,
        "projectId": r.project_id,
        "project_id": r.project_id,
        "name": r.name,
        "path": r.path,
        "imagePath": r.image_path,
        "image_path": r.image_path,
        "width": r.width,
        "height": r.height,
        "flags": parse_json_field(r.flags_json.as_deref()),
        "createdAt": r.created_at,
        "created_at": r.created_at,
        "updatedAt": r.updated_at,
        "updated_at": r.updated_at,
    })
}

fn task_to_json(r: TaskRow) -> Value {
    json!({
        "id": r.id,
        "projectId": r.project_id,
        "project_id": r.project_id,
        "name": r.name,
        "description": r.description,
        "assignedTo": r.assigned_to,
        "assigned_to": r.assigned_to,
        "status": r.status,
        "dueDate": r.due_date,
        "due_date": r.due_date,
        "createdAt": r.created_at,
        "created_at": r.created_at,
        "updatedAt": r.updated_at,
        "updated_at": r.updated_at,
    })
}

fn annotation_to_json(r: AnnotationRow) -> Value {
    let coords: Value = serde_json::from_str(&r.coordinates_json).unwrap_or(json!([]));
    let flags: Value = parse_json_field(r.flags_json.as_deref());
    json!({
        "id": r.id,
        "imageId": r.image_id,
        "image_id": r.image_id,
        "labelId": r.label_id,
        "label_id": r.label_id,
        "name": r.name,
        "color": r.color,
        "type": r.annotation_type,
        "coordinates": coords,
        "groupId": r.group_id,
        "group_id": r.group_id,
        "flags": flags,
        "projectId": r.project_id,
        "project_id": r.project_id,
        "isAIGenerated": r.is_ai_generated != 0,
        "is_ai_generated": r.is_ai_generated != 0,
        "createdAt": r.created_at,
        "created_at": r.created_at,
        "updatedAt": r.updated_at,
        "updated_at": r.updated_at,
    })
}

fn prediction_to_json(r: PredictionRow) -> Value {
    let coords: Value = serde_json::from_str(&r.coordinates_json).unwrap_or(json!([]));
    json!({
        "id": r.id,
        "imageId": r.image_id,
        "image_id": r.image_id,
        "labelId": r.label_id,
        "label_id": r.label_id,
        "labelName": r.label_name,
        "label_name": r.label_name,
        "labelColor": r.label_color,
        "label_color": r.label_color,
        "modelId": r.model_id,
        "model_id": r.model_id,
        "name": r.name,
        "type": r.prediction_type,
        "coordinates": coords,
        "confidence": r.confidence,
        "projectId": r.project_id,
        "project_id": r.project_id,
        "color": r.color,
        "isAIGenerated": r.is_ai_generated != 0,
        "is_ai_generated": r.is_ai_generated != 0,
        "backend": r.backend,
        "inferenceMs": r.inference_ms,
        "inference_ms": r.inference_ms,
        "modelVersion": r.model_version,
        "model_version": r.model_version,
        "family": r.family,
        "variant": r.variant,
        "fromName": r.from_name,
        "from_name": r.from_name,
        "toName": r.to_name,
        "to_name": r.to_name,
        "resultType": r.result_type,
        "result_type": r.result_type,
        "createdAt": r.created_at,
        "created_at": r.created_at,
        "updatedAt": r.updated_at,
        "updated_at": r.updated_at,
    })
}

fn ai_model_to_json(r: AiModelRow) -> Value {
    let metadata: Value = parse_json_field(r.metadata_json.as_deref());
    json!({
        "id": r.id,
        "name": r.name,
        "description": r.description,
        "version": r.version,
        "projectId": r.project_id,
        "project_id": r.project_id,
        "modelPath": r.model_path,
        "model_path": r.model_path,
        "configPath": r.config_path,
        "config_path": r.config_path,
        "modelSize": r.model_size,
        "model_size": r.model_size,
        "isCustom": r.is_custom != 0,
        "is_custom": r.is_custom != 0,
        "type": r.model_type,
        "model_type": r.model_type,
        "status": r.status,
        "category": r.category,
        "isActive": r.is_active != 0,
        "is_active": r.is_active != 0,
        "lastUsed": r.last_used,
        "last_used": r.last_used,
        "backend": r.backend,
        "framework": r.framework,
        "labelsPath": r.labels_path,
        "labels_path": r.labels_path,
        "stride": r.stride,
        "family": r.family,
        "variant": r.variant,
        "defaultRank": r.default_rank,
        "default_rank": r.default_rank,
        "supportsLabelStudioFormat": r.supports_label_studio_format != 0,
        "supports_label_studio_format": r.supports_label_studio_format != 0,
        "taskType": r.task_type,
        "task_type": r.task_type,
        "modelVersion": r.model_version,
        "model_version": r.model_version,
        "modelMetadata": metadata,
        "model_metadata": metadata,
        "createdAt": r.created_at,
        "created_at": r.created_at,
        "updatedAt": r.updated_at,
        "updated_at": r.updated_at,
    })
}

fn setting_to_json(r: SettingRow) -> Value {
    json!({
        "id": r.id,
        "key": r.key,
        "value": r.value,
        "createdAt": r.created_at,
        "created_at": r.created_at,
        "updatedAt": r.updated_at,
        "updated_at": r.updated_at,
    })
}

fn history_to_json(r: HistoryRow) -> Value {
    let labels: Value = parse_json_field(r.labels_json.as_deref());
    json!({
        "id": r.id,
        "projectId": r.project_id,
        "project_id": r.project_id,
        "labels": labels,
        "historyIndex": r.history_index,
        "history_index": r.history_index,
        "canUndo": r.can_undo != 0,
        "can_undo": r.can_undo != 0,
        "canRedo": r.can_redo != 0,
        "can_redo": r.can_redo != 0,
        "createdAt": r.created_at,
        "created_at": r.created_at,
        "updatedAt": r.updated_at,
        "updated_at": r.updated_at,
    })
}

// ── JSON → Row converters ─────────────────────────────────────────────────────

fn project_row_from(v: &Value, now: &str) -> ProjectRow {
    ProjectRow {
        id: get_id(v),
        name: str_owned(v, "name", "name"),
        description: opt_str(v, "description", "description"),
        project_type: str_val(v, "project_type", "type")
            .unwrap_or("classification")
            .to_owned(),
        status: str_owned(v, "status", "status").if_empty("active"),
        settings_json: json_field(v, "settings"),
        metadata_json: json_field(v, "metadata"),
        created_at: str_val(v, "created_at", "createdAt")
            .unwrap_or(now)
            .to_owned(),
        updated_at: now.to_owned(),
    }
}

fn label_row_from(v: &Value, now: &str) -> LabelRow {
    LabelRow {
        id: get_id(v),
        project_id: str_owned(v, "project_id", "projectId"),
        name: str_owned(v, "name", "name"),
        color: str_owned(v, "color", "color").if_empty("#FF0000"),
        category: opt_str(v, "category", "category"),
        description: opt_str(v, "description", "description"),
        is_ai_generated: bool_val(v, "is_ai_generated", "isAIGenerated") as i32,
        created_at: str_val(v, "created_at", "createdAt")
            .unwrap_or(now)
            .to_owned(),
        updated_at: now.to_owned(),
    }
}

fn image_row_from(v: &Value, now: &str) -> ImageRow {
    ImageRow {
        id: get_id(v),
        project_id: str_owned(v, "project_id", "projectId"),
        name: str_owned(v, "name", "name"),
        path: str_owned(v, "path", "path"),
        image_path: opt_str(v, "image_path", "imagePath"),
        width: i32_val(v, "width", "width"),
        height: i32_val(v, "height", "height"),
        flags_json: json_field(v, "flags"),
        created_at: str_val(v, "created_at", "createdAt")
            .unwrap_or(now)
            .to_owned(),
        updated_at: now.to_owned(),
    }
}

fn task_row_from(v: &Value, now: &str) -> TaskRow {
    TaskRow {
        id: get_id(v),
        project_id: str_owned(v, "project_id", "projectId"),
        name: str_owned(v, "name", "name"),
        description: str_owned(v, "description", "description"),
        assigned_to: opt_str(v, "assigned_to", "assignedTo"),
        status: str_owned(v, "status", "status").if_empty("todo"),
        due_date: opt_str(v, "due_date", "dueDate"),
        created_at: str_val(v, "created_at", "createdAt")
            .unwrap_or(now)
            .to_owned(),
        updated_at: now.to_owned(),
    }
}

fn annotation_row_from(v: &Value, now: &str) -> AnnotationRow {
    let coords = v
        .get("coordinates")
        .filter(|c| !c.is_null())
        .map(|c| c.to_string())
        .unwrap_or_else(|| "[]".to_owned());
    let flags = json_field(v, "flags");
    AnnotationRow {
        id: get_id(v),
        image_id: str_owned(v, "image_id", "imageId"),
        label_id: opt_str(v, "label_id", "labelId"),
        name: str_owned(v, "name", "name"),
        color: str_owned(v, "color", "color").if_empty("#FF0000"),
        annotation_type: str_val(v, "annotation_type", "type")
            .unwrap_or("box")
            .to_owned(),
        coordinates_json: coords,
        group_id: opt_i32(v, "group_id", "groupId"),
        flags_json: flags,
        project_id: opt_str(v, "project_id", "projectId"),
        is_ai_generated: bool_val(v, "is_ai_generated", "isAIGenerated") as i32,
        created_at: str_val(v, "created_at", "createdAt")
            .unwrap_or(now)
            .to_owned(),
        updated_at: now.to_owned(),
    }
}

fn prediction_row_from(v: &Value, now: &str) -> PredictionRow {
    let coords = v
        .get("coordinates")
        .filter(|c| !c.is_null())
        .map(|c| c.to_string())
        .unwrap_or_else(|| "[]".to_owned());
    PredictionRow {
        id: get_id(v),
        image_id: str_owned(v, "image_id", "imageId"),
        label_id: opt_str(v, "label_id", "labelId"),
        label_name: opt_str(v, "label_name", "labelName"),
        label_color: opt_str(v, "label_color", "labelColor"),
        model_id: opt_str(v, "model_id", "modelId"),
        name: str_owned(v, "name", "name"),
        prediction_type: str_val(v, "prediction_type", "type")
            .unwrap_or("box")
            .to_owned(),
        coordinates_json: coords,
        confidence: f64_val(v, "confidence", "confidence"),
        project_id: opt_str(v, "project_id", "projectId"),
        color: opt_str(v, "color", "color"),
        is_ai_generated: bool_val(v, "is_ai_generated", "isAIGenerated") as i32,
        backend: opt_str(v, "backend", "backend"),
        inference_ms: opt_f64(v, "inference_ms", "inferenceMs"),
        model_version: opt_str(v, "model_version", "modelVersion"),
        family: opt_str(v, "family", "family"),
        variant: opt_str(v, "variant", "variant"),
        from_name: opt_str(v, "from_name", "fromName"),
        to_name: opt_str(v, "to_name", "toName"),
        result_type: opt_str(v, "result_type", "resultType"),
        created_at: str_val(v, "created_at", "createdAt")
            .unwrap_or(now)
            .to_owned(),
        updated_at: now.to_owned(),
    }
}

fn ai_model_row_from(v: &Value, now: &str) -> AiModelRow {
    let metadata = v
        .get("modelMetadata")
        .or_else(|| v.get("model_metadata"))
        .filter(|val| !val.is_null())
        .map(|val| val.to_string());
    AiModelRow {
        id: get_id(v),
        name: str_owned(v, "name", "name"),
        description: str_owned(v, "description", "description"),
        version: str_owned(v, "version", "version").if_empty("1.0.0"),
        project_id: opt_str(v, "project_id", "projectId"),
        model_path: str_owned(v, "model_path", "modelPath"),
        config_path: str_owned(v, "config_path", "configPath"),
        model_size: i32_val(v, "model_size", "modelSize"),
        is_custom: bool_val(v, "is_custom", "isCustom") as i32,
        model_type: str_val(v, "model_type", "type").unwrap_or("detection").to_owned(),
        status: str_owned(v, "status", "status").if_empty("inactive"),
        category: opt_str(v, "category", "category"),
        is_active: bool_val(v, "is_active", "isActive") as i32,
        last_used: opt_str(v, "last_used", "lastUsed"),
        backend: opt_str(v, "backend", "backend"),
        framework: opt_str(v, "framework", "framework"),
        labels_path: opt_str(v, "labels_path", "labelsPath"),
        stride: opt_i32(v, "stride", "stride"),
        family: opt_str(v, "family", "family"),
        variant: opt_str(v, "variant", "variant"),
        default_rank: opt_i32(v, "default_rank", "defaultRank"),
        supports_label_studio_format: bool_val(
            v,
            "supports_label_studio_format",
            "supportsLabelStudioFormat",
        ) as i32,
        task_type: opt_str(v, "task_type", "taskType"),
        model_version: opt_str(v, "model_version", "modelVersion"),
        metadata_json: metadata,
        created_at: str_val(v, "created_at", "createdAt")
            .unwrap_or(now)
            .to_owned(),
        updated_at: now.to_owned(),
    }
}

fn setting_row_from(v: &Value, now: &str) -> SettingRow {
    SettingRow {
        id: get_id(v),
        key: str_owned(v, "key", "key"),
        value: str_owned(v, "value", "value"),
        created_at: str_val(v, "created_at", "createdAt")
            .unwrap_or(now)
            .to_owned(),
        updated_at: now.to_owned(),
    }
}

fn history_row_from(v: &Value, now: &str) -> HistoryRow {
    let labels_json = v
        .get("labels")
        .filter(|val| !val.is_null())
        .map(|val| val.to_string());
    HistoryRow {
        id: get_id(v),
        project_id: opt_str(v, "project_id", "projectId"),
        labels_json,
        history_index: i32_val(v, "history_index", "historyIndex"),
        can_undo: bool_val(v, "can_undo", "canUndo") as i32,
        can_redo: bool_val(v, "can_redo", "canRedo") as i32,
        created_at: str_val(v, "created_at", "createdAt")
            .unwrap_or(now)
            .to_owned(),
        updated_at: now.to_owned(),
    }
}

// ── String extension helper ───────────────────────────────────────────────────

trait IfEmpty {
    fn if_empty(self, default: &str) -> Self;
}

impl IfEmpty for String {
    fn if_empty(self, default: &str) -> Self {
        if self.is_empty() {
            default.to_owned()
        } else {
            self
        }
    }
}

// ── DesktopStore ──────────────────────────────────────────────────────────────

pub struct DesktopStore {
    connection: RefCell<SqliteConnection>,
}

// SAFETY: DesktopStore is always accessed through Arc<Mutex<DesktopStore>>,
// guaranteeing exclusive access. RefCell is never accessed from multiple threads.
unsafe impl Send for DesktopStore {}

impl DesktopStore {
    pub fn open(path: PathBuf) -> Result<Self, StoreError> {
        let url = path.to_string_lossy().to_string();
        let mut conn = SqliteConnection::establish(&url)?;
        conn.run_pending_migrations(MIGRATIONS)
            .map_err(|e| StoreError::Migration(e.to_string()))?;
        diesel::sql_query("PRAGMA journal_mode=WAL")
            .execute(&mut conn)?;
        diesel::sql_query("PRAGMA foreign_keys=ON")
            .execute(&mut conn)?;
        Ok(DesktopStore {
            connection: RefCell::new(conn),
        })
    }

    fn conn(&self) -> std::cell::RefMut<'_, SqliteConnection> {
        self.connection.borrow_mut()
    }

    // ── Public dispatch (matches EntityStore signature) ───────────────────────

    pub fn upsert_entity(&self, kind: &str, value: Value) -> Result<Value, StoreError> {
        match kind {
            "project" | "projects" => self.upsert_project(value),
            "label" | "labels" => self.upsert_label(value),
            "image" | "images" => self.upsert_image(value),
            "task" | "tasks" => self.upsert_task(value),
            "annotation" | "annotations" => self.upsert_annotation(value),
            "prediction" | "predictions" => self.upsert_prediction(value),
            "ai_model" | "ai_models" => self.upsert_ai_model(value),
            "setting" | "settings" => self.upsert_setting(value),
            "history" => self.upsert_history(value),
            other => Err(StoreError::Migration(format!("Unknown entity kind: {other}"))),
        }
    }

    pub fn get_entity(&self, kind: &str, id: &str) -> Result<Option<Value>, StoreError> {
        match kind {
            "project" | "projects" => self.get_project(id),
            "label" | "labels" => self.get_label(id),
            "image" | "images" => self.get_image(id),
            "task" | "tasks" => self.get_task(id),
            "annotation" | "annotations" => self.get_annotation(id),
            "prediction" | "predictions" => self.get_prediction(id),
            "ai_model" | "ai_models" => self.get_ai_model(id),
            "setting" | "settings" => self.get_setting_entity(id),
            "history" => self.get_history(id),
            _ => Ok(None),
        }
    }

    pub fn list_entities(&self, kind: &str) -> Result<Vec<Value>, StoreError> {
        match kind {
            "project" | "projects" => self.list_projects(),
            "label" | "labels" => self.list_labels(),
            "image" | "images" => self.list_images(),
            "task" | "tasks" => self.list_tasks(),
            "annotation" | "annotations" => self.list_annotations(),
            "prediction" | "predictions" => self.list_predictions(),
            "ai_model" | "ai_models" => self.list_ai_models(),
            "setting" | "settings" => self.list_settings(),
            "history" => self.list_history(),
            _ => Ok(vec![]),
        }
    }

    pub fn list_by_field(
        &self,
        kind: &str,
        field: &str,
        val: &str,
    ) -> Result<Vec<Value>, StoreError> {
        match (kind, field) {
            ("label" | "labels", "project_id") => self.list_labels_by_project(val),
            ("image" | "images", "project_id") => self.list_images_by_project(val),
            ("task" | "tasks", "project_id") => self.list_tasks_by_project(val),
            ("annotation" | "annotations", "image_id") => self.list_annotations_by_image(val),
            ("annotation" | "annotations", "project_id") => {
                self.list_annotations_by_project(val)
            }
            ("prediction" | "predictions", "image_id") => self.list_predictions_by_image(val),
            ("prediction" | "predictions", "project_id") => {
                self.list_predictions_by_project(val)
            }
            ("history", "project_id") => self.list_history_by_project(val),
            _ => Ok(vec![]),
        }
    }

    pub fn delete_entity(&self, kind: &str, id: &str) -> Result<(), StoreError> {
        match kind {
            "project" | "projects" => self.delete_project(id),
            "label" | "labels" => self.delete_label(id),
            "image" | "images" => self.delete_image(id),
            "task" | "tasks" => self.delete_task(id),
            "annotation" | "annotations" => self.delete_annotation(id),
            "prediction" | "predictions" => self.delete_prediction(id),
            "ai_model" | "ai_models" => self.delete_ai_model(id),
            "setting" | "settings" => self.delete_setting(id),
            "history" => self.delete_history(id),
            _ => Ok(()),
        }
    }

    // ── Settings (special: keyed by `key` field) ──────────────────────────────

    pub fn get_setting(&self, key: &str) -> Result<Option<Value>, StoreError> {
        use schema::settings::dsl;
        let row = dsl::settings
            .filter(dsl::key.eq(key))
            .first::<SettingRow>(&mut *self.conn())
            .optional()?;
        Ok(row.map(setting_to_json))
    }

    pub fn upsert_setting(&self, value: Value) -> Result<Value, StoreError> {
        self.upsert_setting_inner(value)
    }

    // ── Secret keys ───────────────────────────────────────────────────────────

    pub fn register_secret_key(&self, namespace: &str, key: &str) -> Result<(), StoreError> {
        use schema::secret_keys::dsl;
        let row = SecretKeyRow {
            id: Uuid::new_v4().to_string(),
            namespace: namespace.to_owned(),
            name: key.to_owned(),
        };
        diesel::replace_into(dsl::secret_keys)
            .values(&row)
            .execute(&mut *self.conn())?;
        Ok(())
    }

    pub fn unregister_secret_key(&self, namespace: &str, key: &str) -> Result<(), StoreError> {
        use schema::secret_keys::dsl;
        diesel::delete(
            dsl::secret_keys
                .filter(dsl::namespace.eq(namespace))
                .filter(dsl::name.eq(key)),
        )
        .execute(&mut *self.conn())?;
        Ok(())
    }

    pub fn list_secret_keys(&self, namespace: &str) -> Result<Vec<String>, StoreError> {
        use schema::secret_keys::dsl;
        let rows = dsl::secret_keys
            .filter(dsl::namespace.eq(namespace))
            .select(dsl::name)
            .load::<String>(&mut *self.conn())?;
        Ok(rows)
    }

    // ── PROJECTS ──────────────────────────────────────────────────────────────

    fn upsert_project(&self, value: Value) -> Result<Value, StoreError> {
        let now = now_iso();
        let row = project_row_from(&value, &now);
        let result = project_to_json(row.clone());
        diesel::replace_into(schema::projects::table)
            .values(&row)
            .execute(&mut *self.conn())?;
        Ok(result)
    }

    fn get_project(&self, id: &str) -> Result<Option<Value>, StoreError> {
        let row = schema::projects::table
            .find(id)
            .select(ProjectRow::as_select())
            .first::<ProjectRow>(&mut *self.conn())
            .optional()?;
        Ok(row.map(project_to_json))
    }

    fn list_projects(&self) -> Result<Vec<Value>, StoreError> {
        let rows = schema::projects::table
            .select(ProjectRow::as_select())
            .load::<ProjectRow>(&mut *self.conn())?;
        Ok(rows.into_iter().map(project_to_json).collect())
    }

    fn delete_project(&self, id: &str) -> Result<(), StoreError> {
        diesel::delete(schema::projects::table.find(id)).execute(&mut *self.conn())?;
        Ok(())
    }

    // ── LABELS ────────────────────────────────────────────────────────────────

    fn upsert_label(&self, value: Value) -> Result<Value, StoreError> {
        let now = now_iso();
        let row = label_row_from(&value, &now);
        let result = label_to_json(row.clone());
        diesel::replace_into(schema::labels::table)
            .values(&row)
            .execute(&mut *self.conn())?;
        Ok(result)
    }

    fn get_label(&self, id: &str) -> Result<Option<Value>, StoreError> {
        let row = schema::labels::table
            .find(id)
            .select(LabelRow::as_select())
            .first::<LabelRow>(&mut *self.conn())
            .optional()?;
        Ok(row.map(label_to_json))
    }

    fn list_labels(&self) -> Result<Vec<Value>, StoreError> {
        let rows = schema::labels::table
            .select(LabelRow::as_select())
            .load::<LabelRow>(&mut *self.conn())?;
        Ok(rows.into_iter().map(label_to_json).collect())
    }

    fn list_labels_by_project(&self, project_id: &str) -> Result<Vec<Value>, StoreError> {
        use schema::labels::dsl;
        let rows = dsl::labels
            .filter(dsl::project_id.eq(project_id))
            .select(LabelRow::as_select())
            .load::<LabelRow>(&mut *self.conn())?;
        Ok(rows.into_iter().map(label_to_json).collect())
    }

    fn delete_label(&self, id: &str) -> Result<(), StoreError> {
        diesel::delete(schema::labels::table.find(id)).execute(&mut *self.conn())?;
        Ok(())
    }

    // ── IMAGES ────────────────────────────────────────────────────────────────

    fn upsert_image(&self, value: Value) -> Result<Value, StoreError> {
        let now = now_iso();
        let row = image_row_from(&value, &now);
        let result = image_to_json(row.clone());
        diesel::replace_into(schema::images::table)
            .values(&row)
            .execute(&mut *self.conn())?;
        Ok(result)
    }

    fn get_image(&self, id: &str) -> Result<Option<Value>, StoreError> {
        let row = schema::images::table
            .find(id)
            .select(ImageRow::as_select())
            .first::<ImageRow>(&mut *self.conn())
            .optional()?;
        Ok(row.map(image_to_json))
    }

    fn list_images(&self) -> Result<Vec<Value>, StoreError> {
        let rows = schema::images::table
            .select(ImageRow::as_select())
            .load::<ImageRow>(&mut *self.conn())?;
        Ok(rows.into_iter().map(image_to_json).collect())
    }

    fn list_images_by_project(&self, project_id: &str) -> Result<Vec<Value>, StoreError> {
        use schema::images::dsl;
        let rows = dsl::images
            .filter(dsl::project_id.eq(project_id))
            .select(ImageRow::as_select())
            .load::<ImageRow>(&mut *self.conn())?;
        Ok(rows.into_iter().map(image_to_json).collect())
    }

    fn delete_image(&self, id: &str) -> Result<(), StoreError> {
        diesel::delete(schema::images::table.find(id)).execute(&mut *self.conn())?;
        Ok(())
    }

    // ── TASKS ─────────────────────────────────────────────────────────────────

    fn upsert_task(&self, value: Value) -> Result<Value, StoreError> {
        let now = now_iso();
        let row = task_row_from(&value, &now);
        let result = task_to_json(row.clone());
        diesel::replace_into(schema::tasks::table)
            .values(&row)
            .execute(&mut *self.conn())?;
        Ok(result)
    }

    fn get_task(&self, id: &str) -> Result<Option<Value>, StoreError> {
        let row = schema::tasks::table
            .find(id)
            .select(TaskRow::as_select())
            .first::<TaskRow>(&mut *self.conn())
            .optional()?;
        Ok(row.map(task_to_json))
    }

    fn list_tasks(&self) -> Result<Vec<Value>, StoreError> {
        let rows = schema::tasks::table
            .select(TaskRow::as_select())
            .load::<TaskRow>(&mut *self.conn())?;
        Ok(rows.into_iter().map(task_to_json).collect())
    }

    fn list_tasks_by_project(&self, project_id: &str) -> Result<Vec<Value>, StoreError> {
        use schema::tasks::dsl;
        let rows = dsl::tasks
            .filter(dsl::project_id.eq(project_id))
            .select(TaskRow::as_select())
            .load::<TaskRow>(&mut *self.conn())?;
        Ok(rows.into_iter().map(task_to_json).collect())
    }

    fn delete_task(&self, id: &str) -> Result<(), StoreError> {
        diesel::delete(schema::tasks::table.find(id)).execute(&mut *self.conn())?;
        Ok(())
    }

    // ── ANNOTATIONS ───────────────────────────────────────────────────────────

    fn upsert_annotation(&self, value: Value) -> Result<Value, StoreError> {
        let now = now_iso();
        let row = annotation_row_from(&value, &now);
        let result = annotation_to_json(row.clone());
        diesel::replace_into(schema::annotations::table)
            .values(&row)
            .execute(&mut *self.conn())?;
        Ok(result)
    }

    fn get_annotation(&self, id: &str) -> Result<Option<Value>, StoreError> {
        let row = schema::annotations::table
            .find(id)
            .select(AnnotationRow::as_select())
            .first::<AnnotationRow>(&mut *self.conn())
            .optional()?;
        Ok(row.map(annotation_to_json))
    }

    fn list_annotations(&self) -> Result<Vec<Value>, StoreError> {
        let rows = schema::annotations::table
            .select(AnnotationRow::as_select())
            .load::<AnnotationRow>(&mut *self.conn())?;
        Ok(rows.into_iter().map(annotation_to_json).collect())
    }

    fn list_annotations_by_image(&self, image_id: &str) -> Result<Vec<Value>, StoreError> {
        use schema::annotations::dsl;
        let rows = dsl::annotations
            .filter(dsl::image_id.eq(image_id))
            .select(AnnotationRow::as_select())
            .load::<AnnotationRow>(&mut *self.conn())?;
        Ok(rows.into_iter().map(annotation_to_json).collect())
    }

    fn list_annotations_by_project(&self, project_id: &str) -> Result<Vec<Value>, StoreError> {
        use schema::annotations::dsl;
        let rows = dsl::annotations
            .filter(dsl::project_id.eq(project_id))
            .select(AnnotationRow::as_select())
            .load::<AnnotationRow>(&mut *self.conn())?;
        Ok(rows.into_iter().map(annotation_to_json).collect())
    }

    fn delete_annotation(&self, id: &str) -> Result<(), StoreError> {
        diesel::delete(schema::annotations::table.find(id)).execute(&mut *self.conn())?;
        Ok(())
    }

    // ── PREDICTIONS ───────────────────────────────────────────────────────────

    fn upsert_prediction(&self, value: Value) -> Result<Value, StoreError> {
        let now = now_iso();
        let row = prediction_row_from(&value, &now);
        let result = prediction_to_json(row.clone());
        diesel::replace_into(schema::predictions::table)
            .values(&row)
            .execute(&mut *self.conn())?;
        Ok(result)
    }

    fn get_prediction(&self, id: &str) -> Result<Option<Value>, StoreError> {
        let row = schema::predictions::table
            .find(id)
            .select(PredictionRow::as_select())
            .first::<PredictionRow>(&mut *self.conn())
            .optional()?;
        Ok(row.map(prediction_to_json))
    }

    fn list_predictions(&self) -> Result<Vec<Value>, StoreError> {
        let rows = schema::predictions::table
            .select(PredictionRow::as_select())
            .load::<PredictionRow>(&mut *self.conn())?;
        Ok(rows.into_iter().map(prediction_to_json).collect())
    }

    fn list_predictions_by_image(&self, image_id: &str) -> Result<Vec<Value>, StoreError> {
        use schema::predictions::dsl;
        let rows = dsl::predictions
            .filter(dsl::image_id.eq(image_id))
            .select(PredictionRow::as_select())
            .load::<PredictionRow>(&mut *self.conn())?;
        Ok(rows.into_iter().map(prediction_to_json).collect())
    }

    fn list_predictions_by_project(&self, project_id: &str) -> Result<Vec<Value>, StoreError> {
        use schema::predictions::dsl;
        let rows = dsl::predictions
            .filter(dsl::project_id.eq(project_id))
            .select(PredictionRow::as_select())
            .load::<PredictionRow>(&mut *self.conn())?;
        Ok(rows.into_iter().map(prediction_to_json).collect())
    }

    fn delete_prediction(&self, id: &str) -> Result<(), StoreError> {
        diesel::delete(schema::predictions::table.find(id)).execute(&mut *self.conn())?;
        Ok(())
    }

    // ── AI MODELS ─────────────────────────────────────────────────────────────

    fn upsert_ai_model(&self, value: Value) -> Result<Value, StoreError> {
        let now = now_iso();
        let row = ai_model_row_from(&value, &now);
        let result = ai_model_to_json(row.clone());
        diesel::replace_into(schema::ai_models::table)
            .values(&row)
            .execute(&mut *self.conn())?;
        Ok(result)
    }

    fn get_ai_model(&self, id: &str) -> Result<Option<Value>, StoreError> {
        let row = schema::ai_models::table
            .find(id)
            .select(AiModelRow::as_select())
            .first::<AiModelRow>(&mut *self.conn())
            .optional()?;
        Ok(row.map(ai_model_to_json))
    }

    fn list_ai_models(&self) -> Result<Vec<Value>, StoreError> {
        let rows = schema::ai_models::table
            .select(AiModelRow::as_select())
            .load::<AiModelRow>(&mut *self.conn())?;
        Ok(rows.into_iter().map(ai_model_to_json).collect())
    }

    fn delete_ai_model(&self, id: &str) -> Result<(), StoreError> {
        diesel::delete(schema::ai_models::table.find(id)).execute(&mut *self.conn())?;
        Ok(())
    }

    // ── SETTINGS ──────────────────────────────────────────────────────────────

    fn upsert_setting_inner(&self, value: Value) -> Result<Value, StoreError> {
        use schema::settings::dsl;
        let now = now_iso();
        // Preserve existing ID if the key already exists in DB
        let key = value
            .get("key")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_owned();
        let existing_id = if !key.is_empty() {
            dsl::settings
                .filter(dsl::key.eq(&key))
                .select(dsl::id)
                .first::<String>(&mut *self.conn())
                .optional()?
        } else {
            None
        };
        let mut row = setting_row_from(&value, &now);
        if let Some(eid) = existing_id {
            row.id = eid;
        }
        let result = setting_to_json(row.clone());
        diesel::replace_into(schema::settings::table)
            .values(&row)
            .execute(&mut *self.conn())?;
        Ok(result)
    }

    fn get_setting_entity(&self, id: &str) -> Result<Option<Value>, StoreError> {
        // Try lookup by ID first, then by key
        let row = schema::settings::table
            .find(id)
            .select(SettingRow::as_select())
            .first::<SettingRow>(&mut *self.conn())
            .optional()?;
        if row.is_some() {
            return Ok(row.map(setting_to_json));
        }
        self.get_setting(id)
    }

    fn list_settings(&self) -> Result<Vec<Value>, StoreError> {
        let rows = schema::settings::table
            .select(SettingRow::as_select())
            .load::<SettingRow>(&mut *self.conn())?;
        Ok(rows.into_iter().map(setting_to_json).collect())
    }

    fn delete_setting(&self, id: &str) -> Result<(), StoreError> {
        diesel::delete(schema::settings::table.find(id)).execute(&mut *self.conn())?;
        Ok(())
    }

    // ── HISTORY ───────────────────────────────────────────────────────────────

    fn upsert_history(&self, value: Value) -> Result<Value, StoreError> {
        let now = now_iso();
        let row = history_row_from(&value, &now);
        let result = history_to_json(row.clone());
        diesel::replace_into(schema::history::table)
            .values(&row)
            .execute(&mut *self.conn())?;
        Ok(result)
    }

    fn get_history(&self, id: &str) -> Result<Option<Value>, StoreError> {
        let row = schema::history::table
            .find(id)
            .select(HistoryRow::as_select())
            .first::<HistoryRow>(&mut *self.conn())
            .optional()?;
        Ok(row.map(history_to_json))
    }

    fn list_history(&self) -> Result<Vec<Value>, StoreError> {
        let rows = schema::history::table
            .select(HistoryRow::as_select())
            .load::<HistoryRow>(&mut *self.conn())?;
        Ok(rows.into_iter().map(history_to_json).collect())
    }

    fn list_history_by_project(&self, project_id: &str) -> Result<Vec<Value>, StoreError> {
        use schema::history::dsl;
        let rows = dsl::history
            .filter(dsl::project_id.eq(project_id))
            .select(HistoryRow::as_select())
            .load::<HistoryRow>(&mut *self.conn())?;
        Ok(rows.into_iter().map(history_to_json).collect())
    }

    fn delete_history(&self, id: &str) -> Result<(), StoreError> {
        diesel::delete(schema::history::table.find(id)).execute(&mut *self.conn())?;
        Ok(())
    }
}

// ── StoreHandle ───────────────────────────────────────────────────────────────

#[derive(Clone)]
pub struct StoreHandle {
    inner: Arc<Mutex<DesktopStore>>,
}

impl StoreHandle {
    pub fn new(inner: Arc<Mutex<DesktopStore>>) -> Self {
        Self { inner }
    }

    fn guard(&self) -> Result<MutexGuard<'_, DesktopStore>, StoreError> {
        self.inner.lock().map_err(|_| StoreError::Unavailable)
    }
}

impl EntityStore for StoreHandle {
    fn upsert_entity(&self, kind: &str, value: Value) -> Result<Value, StoreError> {
        self.guard()?.upsert_entity(kind, value)
    }

    fn get_entity(&self, kind: &str, id: &str) -> Result<Option<Value>, StoreError> {
        self.guard()?.get_entity(kind, id)
    }

    fn list_entities(&self, kind: &str) -> Result<Vec<Value>, StoreError> {
        self.guard()?.list_entities(kind)
    }

    fn list_by_field(
        &self,
        kind: &str,
        field: &str,
        value: &str,
    ) -> Result<Vec<Value>, StoreError> {
        self.guard()?.list_by_field(kind, field, value)
    }

    fn delete_entity(&self, kind: &str, id: &str) -> Result<(), StoreError> {
        self.guard()?.delete_entity(kind, id)
    }
}
