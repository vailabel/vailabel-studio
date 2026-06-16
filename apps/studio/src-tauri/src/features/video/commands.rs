//! Tauri commands exposing Video Annotation to the frontend. Thin wrappers over
//! [`VideoService`]; the FFmpeg pipeline runs on a worker thread and streams
//! progress over `video://progress`.

use serde_json::{json, Value};
use tauri::State;

use crate::{AppError, AppState};

use crate::features::video::model::{
    EntityIdPayload, ExportTracksRequest, ImportVideoRequest, IngestRequest, JobIdPayload,
    ProjectIdPayload, Track, VideoIdPayload,
};

#[tauri::command]
pub fn video_ffmpeg_info(state: State<AppState>) -> Result<Value, AppError> {
    Ok(serde_json::to_value(state.video_service.ffmpeg_info())?)
}

#[tauri::command]
pub fn video_import(
    state: State<AppState>,
    payload: ImportVideoRequest,
) -> Result<Value, AppError> {
    Ok(serde_json::to_value(state.video_service.import_video(payload)?)?)
}

#[tauri::command]
pub fn video_list(
    state: State<AppState>,
    payload: ProjectIdPayload,
) -> Result<Vec<Value>, AppError> {
    state.video_service.list_videos(&payload.project_id)
}

#[tauri::command]
pub fn video_get(state: State<AppState>, payload: EntityIdPayload) -> Result<Value, AppError> {
    Ok(state.video_service.get_video(&payload.id)?.unwrap_or(Value::Null))
}

#[tauri::command]
pub fn video_delete(state: State<AppState>, payload: EntityIdPayload) -> Result<Value, AppError> {
    state.video_service.delete_video(&payload.id)?;
    Ok(json!({ "success": true }))
}

#[tauri::command]
pub fn video_ingest(
    app: tauri::AppHandle,
    state: State<AppState>,
    payload: IngestRequest,
) -> Result<Value, AppError> {
    Ok(serde_json::to_value(state.video_service.start_ingest(&app, payload)?)?)
}

#[tauri::command]
pub fn video_job_status(state: State<AppState>, payload: JobIdPayload) -> Result<Value, AppError> {
    match state.video_service.job(&payload.job_id) {
        Some(job) => Ok(serde_json::to_value(job)?),
        None => Ok(Value::Null),
    }
}

#[tauri::command]
pub fn video_tracks_list(
    state: State<AppState>,
    payload: VideoIdPayload,
) -> Result<Vec<Value>, AppError> {
    state.video_service.list_tracks(&payload.video_id)
}

#[tauri::command]
pub fn video_track_save(state: State<AppState>, payload: Track) -> Result<Value, AppError> {
    Ok(serde_json::to_value(state.video_service.save_track(payload)?)?)
}

#[tauri::command]
pub fn video_track_delete(
    state: State<AppState>,
    payload: EntityIdPayload,
) -> Result<Value, AppError> {
    state.video_service.delete_track(&payload.id)?;
    Ok(json!({ "success": true }))
}

#[tauri::command]
pub fn video_export_tracks(
    state: State<AppState>,
    payload: ExportTracksRequest,
) -> Result<Value, AppError> {
    Ok(serde_json::to_value(state.video_service.export_tracks(payload)?)?)
}
