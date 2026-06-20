//! Background-job glue for Dataset Intelligence.
//!
//! Thin facade over the `vailabel-analysis` [`AnalysisAppService`]: report CRUD
//! forwards straight through. The binary owns the job map, the worker thread,
//! and the unified `studio://activity` Tauri event (kind `analysis`), delivered
//! to the crate's use case through the [`AnalysisReporter`] port. Domain errors
//! convert to `AppError`
//! via the `From` impl in `crate::composition`.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::thread;

use serde_json::Value;
use tauri::AppHandle;
use uuid::Uuid;

use vailabel_analysis::application::{AnalysisAppService, AnalysisReporter};
use vailabel_analysis::contracts::AnalysisRequest;
use vailabel_analysis::domain::AnalysisJob;

use crate::{emit_activity, now_iso, ActivityEvent, AppError};

type JobMap = Arc<Mutex<HashMap<String, AnalysisJob>>>;

/// Forwards report CRUD to the app service; owns the analysis job lifecycle.
#[derive(Clone)]
pub struct AnalysisService {
    app: Arc<AnalysisAppService>,
    jobs: JobMap,
}

impl AnalysisService {
    pub fn new(app: Arc<AnalysisAppService>) -> Self {
        Self {
            app,
            jobs: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Queue an analysis and return its job handle. The actual work runs on a
    /// detached worker thread.
    pub fn start(
        &self,
        app: &AppHandle,
        request: AnalysisRequest,
    ) -> Result<AnalysisJob, AppError> {
        let job = AnalysisJob::new(
            Uuid::new_v4().to_string(),
            request.project_id.clone(),
            now_iso(),
        );
        self.put_job(job.clone());

        let service = self.clone();
        let app = app.clone();
        let job_id = job.job_id.clone();
        thread::spawn(move || service.run_job(&app, request, job_id));

        Ok(job)
    }

    pub fn job(&self, job_id: &str) -> Option<AnalysisJob> {
        self.jobs.lock().ok()?.get(job_id).cloned()
    }

    pub fn list_reports(&self, project_id: &str) -> Result<Vec<Value>, AppError> {
        Ok(self.app.list_reports(project_id)?)
    }

    pub fn get_report(&self, id: &str) -> Result<Option<Value>, AppError> {
        Ok(self.app.get_report(id)?)
    }

    pub fn latest_report(&self, project_id: &str) -> Result<Option<Value>, AppError> {
        Ok(self.app.latest_report(project_id)?)
    }

    pub fn delete_report(&self, id: &str) -> Result<(), AppError> {
        Ok(self.app.delete_report(id)?)
    }

    fn run_job(&self, app: &AppHandle, request: AnalysisRequest, job_id: String) {
        let mut reporter = TauriAnalysisReporter {
            jobs: self.jobs.clone(),
            app: app.clone(),
            job_id: job_id.clone(),
        };
        match self.app.run(&request, &mut reporter) {
            Ok(report_id) => {
                update_job(&self.jobs, app, &job_id, |job| {
                    job.status = "completed".into();
                    job.stage = "Completed".into();
                    job.progress = 1.0;
                    job.report_id = Some(report_id.clone());
                });
            }
            Err(err) => {
                update_job(&self.jobs, app, &job_id, |job| {
                    job.status = "failed".into();
                    job.stage = "Failed".into();
                    job.error = Some(err.to_string());
                });
            }
        }
    }

    fn put_job(&self, job: AnalysisJob) {
        if let Ok(mut map) = self.jobs.lock() {
            map.insert(job.job_id.clone(), job);
        }
    }
}

/// Maps the crate's analysis progress hooks to job-map updates streamed over
/// the unified `studio://activity` channel.
struct TauriAnalysisReporter {
    jobs: JobMap,
    app: AppHandle,
    job_id: String,
}

impl AnalysisReporter for TauriAnalysisReporter {
    fn loading_dataset(&mut self) {
        update_job(&self.jobs, &self.app, &self.job_id, |job| {
            job.status = "running".into();
            job.stage = "Loading dataset".into();
        });
    }

    fn analyzing_metadata(&mut self, total: usize) {
        update_job(&self.jobs, &self.app, &self.job_id, |job| {
            job.stage = "Analyzing metadata".into();
            job.total = total;
            job.progress = 0.05;
        });
    }

    fn analyzing_images(&mut self, processed: usize, total: usize) {
        update_job(&self.jobs, &self.app, &self.job_id, |job| {
            job.processed = processed;
            job.stage = format!("Analyzing images ({processed}/{total})");
            // metadata done at 5%, pixel pass spans 5%..90%
            job.progress = 0.05 + 0.85 * (processed as f64 / total.max(1) as f64);
        });
    }

    fn detecting_outliers(&mut self) {
        update_job(&self.jobs, &self.app, &self.job_id, |job| {
            job.stage = "Detecting outliers".into();
            job.progress = 0.92;
        });
    }

    fn saving_report(&mut self) {
        update_job(&self.jobs, &self.app, &self.job_id, |job| {
            job.stage = "Saving report".into();
            job.progress = 0.97;
        });
    }
}

/// Mutate the stored job in place and broadcast the new state to the frontend
/// over the unified activity channel. The full `AnalysisJob` rides along as the
/// activity `data` so the Dataset Intelligence viewmodel reads its rich job
/// (report id, error, …) off the same event.
fn update_job<F: FnOnce(&mut AnalysisJob)>(jobs: &JobMap, app: &AppHandle, job_id: &str, mutate: F) {
    let snapshot = {
        let mut map = match jobs.lock() {
            Ok(map) => map,
            Err(_) => return,
        };
        let Some(job) = map.get_mut(job_id) else {
            return;
        };
        mutate(job);
        job.updated_at = now_iso();
        job.clone()
    };
    let event = ActivityEvent::from_status(
        format!("analysis:{}", snapshot.job_id),
        "analysis",
        "Dataset analysis",
        &snapshot.status,
    )
    .message(snapshot.stage.clone())
    .percent(Some(snapshot.progress * 100.0))
    .data(serde_json::to_value(&snapshot).unwrap_or(Value::Null));
    emit_activity(app, event);
}
