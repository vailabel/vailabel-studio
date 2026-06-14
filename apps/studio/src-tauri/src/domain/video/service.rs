//! Orchestration for Video Annotation.
//!
//! Owns persistence (JSON-blob `videos` / `tracks` tables, mirroring the
//! analysis-report store) and drives the FFmpeg pipeline. The slow ingest pass
//! (extract filmstrip + detect scenes) runs on a detached worker thread and
//! streams progress over `video://progress`, exactly like the Dataset
//! Intelligence analysis service.

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex, MutexGuard};
use std::thread;

use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager};
use uuid::Uuid;

use crate::store::DesktopStore;
use crate::{now_iso, AppError};

use super::ffmpeg;
use super::interpolation;
use super::model::*;

pub const PROGRESS_EVENT: &str = "video://progress";

type JobMap = Arc<Mutex<HashMap<String, VideoJob>>>;

#[derive(Clone)]
pub struct VideoService {
    store: Arc<Mutex<DesktopStore>>,
    frames_root: PathBuf,
    jobs: JobMap,
}

impl VideoService {
    pub fn new(store: Arc<Mutex<DesktopStore>>, frames_root: PathBuf) -> Self {
        Self {
            store,
            frames_root,
            jobs: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    fn guard(&self) -> Result<MutexGuard<'_, DesktopStore>, AppError> {
        self.store
            .lock()
            .map_err(|_| AppError::Message("Desktop store is unavailable".into()))
    }

    pub fn ffmpeg_info(&self) -> FfmpegInfo {
        ffmpeg::info()
    }

    // ── Videos ────────────────────────────────────────────────────────────────

    /// Import a clip: probe metadata with ffprobe (falling back to the
    /// webview-supplied values when FFmpeg is absent) and persist the record.
    pub fn import_video(&self, req: ImportVideoRequest) -> Result<Video, AppError> {
        let probed = ffmpeg::probe(&req.path).ok();

        let fps = probed
            .as_ref()
            .map(|p| p.fps)
            .filter(|f| *f > 0.0)
            .or(Some(req.fps).filter(|f| *f > 0.0))
            .unwrap_or(30.0);
        let duration = probed
            .as_ref()
            .map(|p| p.duration)
            .filter(|d| *d > 0.0)
            .unwrap_or(req.duration);
        let width = probed.as_ref().map(|p| p.width).unwrap_or(req.width);
        let height = probed.as_ref().map(|p| p.height).unwrap_or(req.height);
        let frame_count = probed
            .as_ref()
            .map(|p| p.frame_count)
            .filter(|c| *c > 0)
            .unwrap_or_else(|| (duration * fps).round() as i64)
            .max(0);

        let now = now_iso();
        let video = Video {
            id: Uuid::new_v4().to_string(),
            project_id: req.project_id,
            name: req.name,
            path: req.path,
            fps,
            duration,
            width,
            height,
            frame_count,
            sample_fps: 0.0,
            frames_dir: String::new(),
            frames: Vec::new(),
            scene_cuts: Vec::new(),
            status: "imported".into(),
            created_at: now.clone(),
            updated_at: now,
        };
        self.persist_video(&video)?;
        Ok(video)
    }

    fn persist_video(&self, video: &Video) -> Result<(), AppError> {
        let json = serde_json::to_string(video)?;
        self.guard()?.upsert_video(
            &video.id,
            &video.project_id,
            &video.created_at,
            &video.updated_at,
            &json,
        )?;
        Ok(())
    }

    pub fn list_videos(&self, project_id: &str) -> Result<Vec<Value>, AppError> {
        Ok(self.guard()?.list_videos(project_id)?)
    }

    pub fn get_video(&self, id: &str) -> Result<Option<Value>, AppError> {
        Ok(self.guard()?.get_video(id)?)
    }

    fn get_video_typed(&self, id: &str) -> Result<Option<Video>, AppError> {
        match self.guard()?.get_video(id)? {
            Some(value) => Ok(Some(serde_json::from_value(value)?)),
            None => Ok(None),
        }
    }

    pub fn delete_video(&self, id: &str) -> Result<(), AppError> {
        // Best-effort cleanup of the extracted frame cache.
        let dir = self.frames_root.join(id);
        if dir.exists() {
            let _ = std::fs::remove_dir_all(&dir);
        }
        let store = self.guard()?;
        store.delete_tracks_for_video(id)?;
        store.delete_video(id)?;
        Ok(())
    }

    pub fn job(&self, job_id: &str) -> Option<VideoJob> {
        self.jobs.lock().ok()?.get(job_id).cloned()
    }

    // ── Ingest (FFmpeg pipeline) ──────────────────────────────────────────────

    /// Queue the extract + scene-detect pass on a worker thread.
    pub fn start_ingest(&self, app: &AppHandle, req: IngestRequest) -> Result<VideoJob, AppError> {
        if !ffmpeg::is_available() {
            return Err(AppError::Message(
                "FFmpeg was not found. Install FFmpeg (with CUDA for GPU decode) or set \
                 VAILABEL_FFMPEG."
                    .into(),
            ));
        }
        let video = self
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
        match self.ingest_inner(app, &req, &mut video, &job_id) {
            Ok(()) => {
                video.status = "ready".into();
                video.updated_at = now_iso();
                let _ = self.persist_video(&video);
                self.update_job(app, &job_id, |job| {
                    job.status = "completed".into();
                    job.stage = "Ready".into();
                    job.progress = 1.0;
                });
            }
            Err(err) => {
                video.status = "failed".into();
                video.updated_at = now_iso();
                let _ = self.persist_video(&video);
                self.update_job(app, &job_id, |job| {
                    job.status = "failed".into();
                    job.stage = "Failed".into();
                    job.error = Some(err.to_string());
                });
            }
        }
    }

    fn ingest_inner(
        &self,
        app: &AppHandle,
        req: &IngestRequest,
        video: &mut Video,
        job_id: &str,
    ) -> Result<(), AppError> {
        let sample_fps = req.sample_fps.unwrap_or(2.0).clamp(0.25, 10.0);
        let threshold = req.scene_threshold.unwrap_or(0.4).clamp(0.05, 0.95);
        let use_cuda = req.use_cuda.unwrap_or(true) && ffmpeg::has_cuda();

        video.status = "processing".into();
        let _ = self.persist_video(video);
        self.update_job(app, job_id, |job| {
            job.status = "running".into();
            job.stage = "Extracting frames".into();
            job.progress = 0.02;
        });

        // ── Frame extraction (0%..70%) ──────────────────────────────────────
        let frames_dir = self.frames_root.join(&video.id);
        let app_for_progress = app.clone();
        let job_for_progress = job_id.to_string();
        let service = self.clone();
        let frames = ffmpeg::extract_frames(
            &video.path,
            &frames_dir,
            sample_fps,
            240,
            video.duration,
            video.fps,
            use_cuda,
            move |fraction| {
                service.update_job(&app_for_progress, &job_for_progress, |job| {
                    job.stage = "Extracting frames".into();
                    job.progress = 0.02 + fraction * 0.68;
                });
            },
        )?;

        // Let the asset protocol serve the extracted frames to the webview.
        let _ = app
            .asset_protocol_scope()
            .allow_directory(&frames_dir, true);

        // ── Scene detection (70%..95%) ──────────────────────────────────────
        self.update_job(app, job_id, |job| {
            job.stage = "Detecting scenes".into();
            job.progress = 0.72;
        });
        let scene_cuts = ffmpeg::detect_scenes(&video.path, video.fps, threshold, use_cuda)?;

        // ── Persist ─────────────────────────────────────────────────────────
        self.update_job(app, job_id, |job| {
            job.stage = "Saving".into();
            job.progress = 0.97;
        });
        video.sample_fps = sample_fps;
        video.frames_dir = frames_dir.to_string_lossy().to_string();
        video.frames = frames;
        video.scene_cuts = scene_cuts;
        Ok(())
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

    pub fn save_track(&self, mut track: Track) -> Result<Track, AppError> {
        if track.id.is_empty() {
            track.id = Uuid::new_v4().to_string();
        }
        if track.created_at.is_empty() {
            track.created_at = now_iso();
        }
        track.updated_at = now_iso();
        track.keyframes.sort_by_key(|kf| kf.frame);

        let json = serde_json::to_string(&track)?;
        self.guard()?.upsert_track(
            &track.id,
            &track.video_id,
            &track.project_id,
            &track.created_at,
            &track.updated_at,
            &json,
        )?;
        Ok(track)
    }

    pub fn list_tracks(&self, video_id: &str) -> Result<Vec<Value>, AppError> {
        Ok(self.guard()?.list_tracks(video_id)?)
    }

    pub fn delete_track(&self, id: &str) -> Result<(), AppError> {
        self.guard()?.delete_track(id)?;
        Ok(())
    }

    // ── Export / materialization ──────────────────────────────────────────────

    /// Resolve every track's interpolated shape across a frame range — sparse
    /// keyframe tracks → dense per-frame annotations for export.
    pub fn export_tracks(
        &self,
        req: ExportTracksRequest,
    ) -> Result<Vec<MaterializedShape>, AppError> {
        let video = self
            .get_video_typed(&req.video_id)?
            .ok_or_else(|| AppError::Message("Video not found".into()))?;

        let start = req.start_frame.unwrap_or(0).max(0);
        let end = req
            .end_frame
            .unwrap_or_else(|| (video.frame_count - 1).max(0));
        let step = req.step.unwrap_or(1).max(1);

        let track_values = self.guard()?.list_tracks(&req.video_id)?;
        let mut out = Vec::new();
        for value in track_values {
            let track: Track = serde_json::from_value(value)?;
            for (frame, sampled) in interpolation::materialize(&track, start, end, step) {
                out.push(MaterializedShape {
                    track_id: track.id.clone(),
                    label_id: track.label_id.clone(),
                    label_name: track.label_name.clone(),
                    color: track.color.clone(),
                    kind: track.kind.clone(),
                    frame,
                    shape: sampled.shape,
                    keyframe: sampled.keyframe,
                    interpolated: !sampled.keyframe,
                });
            }
        }
        Ok(out)
    }
}
