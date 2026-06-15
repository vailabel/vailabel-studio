//! Ingest coordination glue for Video Annotation.
//!
//! Thin facade over the `vailabel-video` [`VideoAppService`]: CRUD/export/track
//! calls forward straight through. The binary-only concerns of ingest stay
//! here — the in-memory job map, the worker thread, the `video://progress`
//! Tauri event, and the asset-protocol scope for extracted frames — delivered to
//! the crate through the [`IngestReporter`] port. Domain errors convert to
//! `AppError` via the `From` impl in `crate::composition`.

use std::collections::HashMap;
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::thread;

use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager};
use uuid::Uuid;

use vailabel_video::application::{IngestReporter, VideoAppService};
use vailabel_video::contracts::{ExportTracksRequest, ImportVideoRequest, IngestRequest};
use vailabel_video::domain::{FfmpegInfo, MaterializedShape, Track, Video, VideoJob};

use crate::{now_iso, AppError};

pub const PROGRESS_EVENT: &str = "video://progress";

type JobMap = Arc<Mutex<HashMap<String, VideoJob>>>;

/// Forwards CRUD/export to the app service; owns the ingest job lifecycle.
#[derive(Clone)]
pub struct VideoService {
    app: Arc<VideoAppService>,
    jobs: JobMap,
}

impl VideoService {
    pub fn new(app: Arc<VideoAppService>) -> Self {
        Self {
            app,
            jobs: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn ffmpeg_info(&self) -> FfmpegInfo {
        self.app.ffmpeg_info()
    }

    // ── Videos ────────────────────────────────────────────────────────────────

    pub fn import_video(&self, req: ImportVideoRequest) -> Result<Video, AppError> {
        Ok(self.app.import_video(req)?)
    }

    pub fn list_videos(&self, project_id: &str) -> Result<Vec<Value>, AppError> {
        Ok(self.app.list_videos(project_id)?)
    }

    pub fn get_video(&self, id: &str) -> Result<Option<Value>, AppError> {
        Ok(self.app.get_video(id)?)
    }

    pub fn delete_video(&self, id: &str) -> Result<(), AppError> {
        Ok(self.app.delete_video(id)?)
    }

    pub fn job(&self, job_id: &str) -> Option<VideoJob> {
        self.jobs.lock().ok()?.get(job_id).cloned()
    }

    // ── Ingest (FFmpeg pipeline on a worker thread) ────────────────────────────

    /// Queue the extract + scene-detect pass on a worker thread.
    pub fn start_ingest(&self, app: &AppHandle, req: IngestRequest) -> Result<VideoJob, AppError> {
        if !self.app.pipeline_available() {
            return Err(AppError::Message(
                "FFmpeg was not found. Install FFmpeg (with CUDA for GPU decode) or set \
                 VAILABEL_FFMPEG."
                    .into(),
            ));
        }
        let video = self
            .app
            .get_video_typed(&req.video_id)?
            .ok_or_else(|| AppError::Message("Video not found".into()))?;

        let job = VideoJob::new(
            Uuid::new_v4().to_string(),
            video.id.clone(),
            video.project_id.clone(),
        );
        if let Ok(mut jobs) = self.jobs.lock() {
            jobs.insert(job.job_id.clone(), job.clone());
        }

        let service = self.clone();
        let app = app.clone();
        let job_id = job.job_id.clone();
        thread::spawn(move || service.run_ingest(&app, req, video, job_id));

        Ok(job)
    }

    fn run_ingest(&self, app: &AppHandle, req: IngestRequest, mut video: Video, job_id: String) {
        // Mark running before the heavy work (the app service reports the
        // per-stage progress from here on through the reporter).
        self.update_job(app, &job_id, |job| {
            job.status = "running".into();
            job.stage = "Extracting frames".into();
            job.progress = 0.02;
        });

        let mut reporter = TauriIngestReporter {
            service: self.clone(),
            app: app.clone(),
            job_id: job_id.clone(),
        };

        match self.app.ingest(&req, &mut video, &mut reporter) {
            Ok(()) => {
                video.status = "ready".into();
                video.updated_at = now_iso();
                let _ = self.app.persist_video(&video);
                self.update_job(app, &job_id, |job| {
                    job.status = "completed".into();
                    job.stage = "Ready".into();
                    job.progress = 1.0;
                });
            }
            Err(err) => {
                video.status = "failed".into();
                video.updated_at = now_iso();
                let _ = self.app.persist_video(&video);
                self.update_job(app, &job_id, |job| {
                    job.status = "failed".into();
                    job.stage = "Failed".into();
                    job.error = Some(err.to_string());
                });
            }
        }
    }

    fn update_job<F: FnOnce(&mut VideoJob)>(&self, app: &AppHandle, job_id: &str, mutate: F) {
        let snapshot = {
            let mut map = match self.jobs.lock() {
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
        let _ = app.emit(PROGRESS_EVENT, snapshot);
    }

    // ── Tracks ────────────────────────────────────────────────────────────────

    pub fn save_track(&self, track: Track) -> Result<Track, AppError> {
        Ok(self.app.save_track(track)?)
    }

    pub fn list_tracks(&self, video_id: &str) -> Result<Vec<Value>, AppError> {
        Ok(self.app.list_tracks(video_id)?)
    }

    pub fn delete_track(&self, id: &str) -> Result<(), AppError> {
        Ok(self.app.delete_track(id)?)
    }

    // ── Export / materialization ──────────────────────────────────────────────

    pub fn export_tracks(
        &self,
        req: ExportTracksRequest,
    ) -> Result<Vec<MaterializedShape>, AppError> {
        Ok(self.app.export_tracks(req)?)
    }
}

/// Bridges the crate's ingest progress to the webview: job-map updates streamed
/// over `video://progress`, plus granting the asset-protocol scope so the
/// extracted frames load.
struct TauriIngestReporter {
    service: VideoService,
    app: AppHandle,
    job_id: String,
}

impl IngestReporter for TauriIngestReporter {
    fn progress(&mut self, stage: &str, progress: f64) {
        let stage = stage.to_string();
        self.service.update_job(&self.app, &self.job_id, |job| {
            job.stage = stage;
            job.progress = progress;
        });
    }

    fn frames_ready(&mut self, frames_dir: &Path) {
        let _ = self
            .app
            .asset_protocol_scope()
            .allow_directory(frames_dir, true);
    }
}
