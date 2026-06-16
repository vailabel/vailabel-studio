//! The `studio://domain-event` emission helpers + wire struct. A mutating use
//! case emits one of these after it commits, so the webview refetches. Re-exported
//! from the crate root (`crate::emit_domain_event`, `crate::emit_domain_event_for_ids`).

use serde::Serialize;
use serde_json::Value;
use tauri::{AppHandle, Emitter};

use super::entity::{now_iso, value_string};
use crate::AppError;

const DOMAIN_EVENT_NAME: &str = "studio://domain-event";

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct StudioDomainEvent {
    entity: String,
    action: String,
    id: String,
    project_id: Option<String>,
    image_id: Option<String>,
    occurred_at: String,
}

fn domain_event_from_value(entity: &str, action: &str, value: &Value) -> StudioDomainEvent {
    StudioDomainEvent {
        entity: entity.to_string(),
        action: action.to_string(),
        id: value_string(value, "id", "id").unwrap_or_default(),
        project_id: value_string(value, "projectId", "project_id"),
        image_id: value_string(value, "imageId", "image_id"),
        occurred_at: now_iso(),
    }
}

pub fn emit_domain_event(
    app: &AppHandle,
    entity: &str,
    action: &str,
    value: &Value,
) -> Result<(), AppError> {
    app.emit(
        DOMAIN_EVENT_NAME,
        domain_event_from_value(entity, action, value),
    )?;
    Ok(())
}

pub(crate) fn emit_domain_event_for_ids(
    app: &AppHandle,
    entity: &str,
    action: &str,
    id: String,
    project_id: Option<String>,
    image_id: Option<String>,
) -> Result<(), AppError> {
    app.emit(
        DOMAIN_EVENT_NAME,
        StudioDomainEvent {
            entity: entity.to_string(),
            action: action.to_string(),
            id,
            project_id,
            image_id,
            occurred_at: now_iso(),
        },
    )?;
    Ok(())
}
