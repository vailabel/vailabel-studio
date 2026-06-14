use crate::domain::common::repository::CrudRepository;
use crate::{emit_domain_event, AppError};
use serde::{de::DeserializeOwned, Serialize};
use serde_json::{json, Value};
use uuid::Uuid;

pub trait HasId {
    fn id(&self) -> &str;
}

/// Ensure the incoming payload carries a non-empty `id` before it is
/// deserialized into a typed entity. The frontend omits `id` when creating a
/// new entity and relies on the backend to mint one (the same contract the
/// untyped `normalize_entity` path honors). Without this, `serde` fails with
/// "missing field `id`" for create requests.
fn ensure_id(payload: &mut Value) {
    if let Value::Object(object) = payload {
        let has_id = object
            .get("id")
            .and_then(Value::as_str)
            .map(|id| !id.is_empty())
            .unwrap_or(false);
        if !has_id {
            object.insert("id".into(), Value::String(Uuid::new_v4().to_string()));
        }
    }
}

pub fn list_entities<T, R>(repo: &R) -> Result<Vec<T>, AppError>
where
    R: CrudRepository<T> + ?Sized,
{
    Ok(repo.list()?)
}

pub fn list_entities_by_field<T, R>(repo: &R, field: &str, value: &str) -> Result<Vec<T>, AppError>
where
    R: CrudRepository<T> + ?Sized,
{
    Ok(repo.list_by_field(field, value)?)
}

pub fn get_entity<T, R>(repo: &R, id: &str, not_found_message: &str) -> Result<T, AppError>
where
    R: CrudRepository<T> + ?Sized,
{
    repo.get(id)?
        .ok_or_else(|| AppError::Message(not_found_message.to_string()))
}

pub fn save_entity<T, R>(
    repo: &R,
    app: &tauri::AppHandle,
    event_entity: &str,
    mut payload: Value,
) -> Result<T, AppError>
where
    T: DeserializeOwned + Serialize + HasId,
    R: CrudRepository<T> + ?Sized,
{
    ensure_id(&mut payload);
    let entity: T = serde_json::from_value(payload)?;
    let (entity, action) = if repo.get(entity.id())?.is_some() {
        (repo.update(&entity)?, "updated")
    } else {
        (repo.create(&entity)?, "created")
    };

    let value = serde_json::to_value(&entity)?;
    emit_domain_event(app, event_entity, action, &value)?;
    Ok(entity)
}

pub fn delete_entity<T, R>(
    repo: &R,
    app: &tauri::AppHandle,
    event_entity: &str,
    id: &str,
    not_found_message: &str,
) -> Result<Value, AppError>
where
    T: Serialize,
    R: CrudRepository<T> + ?Sized,
{
    let entity = get_entity(repo, id, not_found_message)?;
    repo.delete(id)?;

    let value = serde_json::to_value(&entity)?;
    emit_domain_event(app, event_entity, "deleted", &value)?;
    Ok(json!({ "success": true }))
}
