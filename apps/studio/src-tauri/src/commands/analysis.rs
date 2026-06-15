//! Tauri commands exposing Dataset Intelligence to the frontend. Thin wrappers
//! over [`AnalysisService`]; all heavy lifting happens on the worker thread.

use serde_json::{json, Value};
use tauri::State;

use crate::{AppError, AppState};

use crate::analysis::model::{AnalysisRequest, JobIdPayload, ProjectIdPayload, ReportIdPayload};

#[tauri::command]
pub fn analysis_run(
    app: tauri::AppHandle,
    state: State<AppState>,
    payload: AnalysisRequest,
) -> Result<Value, AppError> {
    let job = state.analysis_service.start(&app, payload)?;
    Ok(serde_json::to_value(job)?)
}

#[tauri::command]
pub fn analysis_job_status(
    state: State<AppState>,
    payload: JobIdPayload,
) -> Result<Value, AppError> {
    match state.analysis_service.job(&payload.job_id) {
        Some(job) => Ok(serde_json::to_value(job)?),
        None => Ok(Value::Null),
    }
}

#[tauri::command]
pub fn analysis_reports_list(
    state: State<AppState>,
    payload: ProjectIdPayload,
) -> Result<Vec<Value>, AppError> {
    state.analysis_service.list_reports(&payload.project_id)
}

#[tauri::command]
pub fn analysis_report_get(
    state: State<AppState>,
    payload: ReportIdPayload,
) -> Result<Value, AppError> {
    Ok(state.analysis_service.get_report(&payload.id)?.unwrap_or(Value::Null))
}

#[tauri::command]
pub fn analysis_report_latest(
    state: State<AppState>,
    payload: ProjectIdPayload,
) -> Result<Value, AppError> {
    Ok(state
        .analysis_service
        .latest_report(&payload.project_id)?
        .unwrap_or(Value::Null))
}

#[tauri::command]
pub fn analysis_report_delete(
    state: State<AppState>,
    payload: ReportIdPayload,
) -> Result<Value, AppError> {
    state.analysis_service.delete_report(&payload.id)?;
    Ok(json!({ "success": true }))
}
