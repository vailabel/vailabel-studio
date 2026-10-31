//! Automatic retraining ("continuous training"): while Studio is open, a
//! project with it enabled gets a new training run once enough newly labeled
//! items have accumulated since its last run.
//!
//! The policy is `vailabel_training::domain::should_retrain`; this file only
//! gathers its inputs and starts the run the same way the training dialog does
//! (export the dataset, then `training_start`) — on this computer or on the
//! project's training agent, fine-tuning from the last model when configured.

use std::collections::HashSet;
use std::time::Duration;

use serde_json::json;
use tauri::Manager;
use vailabel_project::application::ListProjectsQuery;
use vailabel_project::domain::Project;
use vailabel_training::domain::should_retrain;

use super::agents::RunMeta;
use super::commands::TrainingStartPayload;
use crate::features::dataset::service::DatasetExportPayload;
use crate::{AppError, AppState};

/// Wait for the app to settle after launch before the first check.
const STARTUP_DELAY: Duration = Duration::from_secs(120);
const CHECK_INTERVAL: Duration = Duration::from_secs(300);

/// Items in a project that carry at least one annotation. The same measure is
/// recorded on every run at start, so "new since the last run" compares like
/// with like.
pub fn count_labeled_items(state: &AppState, project_id: &str) -> Result<u64, AppError> {
    let items: HashSet<String> = state
        .annotation_repo
        .list_by_project(project_id)?
        .into_iter()
        .map(|annotation| annotation.item_id)
        .collect();
    Ok(items.len() as u64)
}

/// Start a retrain for `project` if its policy says so. Returns the new run id.
async fn check_project(
    app: &tauri::AppHandle,
    state: &AppState,
    project: &Project,
) -> Result<Option<String>, AppError> {
    let Some(training) = project.config.as_ref().map(|config| &config.training) else {
        return Ok(None);
    };
    if !training.auto_retrain {
        return Ok(None);
    }

    let mut runs: Vec<_> = state
        .training_service
        .list()?
        .into_iter()
        .filter(|run| run.project_id == project.id)
        .collect();
    let run_in_flight = runs.iter().any(|run| run.status.is_in_flight());
    runs.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    let labeled_at_last_run = runs
        .iter()
        .find_map(|run| RunMeta::of(&run.config).labeled_items);
    let labeled_now = count_labeled_items(state, &project.id)?;

    if !should_retrain(
        labeled_now,
        labeled_at_last_run,
        training.min_new_items,
        run_in_flight,
    ) {
        return Ok(None);
    }

    let export = state.dataset_service.export_yolo(
        app,
        DatasetExportPayload {
            project_id: project.id.clone(),
            val_split: None,
        },
    )?;
    let meta = RunMeta {
        agent_id: training.agent_id.clone(),
        continue_from: training.continue_from_last.then(|| "last".to_string()),
        auto: true,
        ..RunMeta::default()
    };
    let run = super::ops::training_start(
        app,
        state,
        TrainingStartPayload {
            project_id: project.id.clone(),
            model_family: training.model_family.clone(),
            dataset_path: export.dataset_path,
            model_id: None,
            name: Some(format!("Auto retrain · {labeled_now} labeled items")),
            config: meta.write_into(json!({ "epochs": training.epochs })),
        },
    )
    .await?;
    Ok(run.get("id").and_then(|id| id.as_str()).map(str::to_owned))
}

/// Check every project once. A project that fails (nothing exportable yet, its
/// agent is offline, …) is logged and does not stop the others.
pub async fn check_all(app: &tauri::AppHandle) {
    let Some(state) = app.try_state::<AppState>() else {
        return;
    };
    let projects = match state.project_service.list(ListProjectsQuery) {
        Ok(projects) => projects,
        Err(error) => {
            eprintln!("[auto-retrain] could not list projects: {error}");
            return;
        }
    };
    for project in &projects {
        match check_project(app, state.inner(), project).await {
            Ok(Some(run_id)) => {
                eprintln!(
                    "[auto-retrain] started run {run_id} for project {}",
                    project.name
                )
            }
            Ok(None) => {}
            Err(error) => eprintln!("[auto-retrain] {}: {error}", project.name),
        }
    }
}

/// Run the periodic check for as long as the app lives.
pub fn spawn(app: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(STARTUP_DELAY).await;
        loop {
            check_all(&app).await;
            tokio::time::sleep(CHECK_INTERVAL).await;
        }
    });
}
