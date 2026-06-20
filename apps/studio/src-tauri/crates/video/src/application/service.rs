//! The Video Annotation use-case service.

use std::path::PathBuf;
use std::sync::Arc;

use serde_json::Value;
use vailabel_core::{DomainError, DomainResult};
use vailabel_shared::{new_id, now_iso};

use crate::application::ports::{IngestReporter, VideoPipeline};
use crate::contracts::{ExportTracksRequest, ImportVideoRequest, IngestRequest};
use crate::domain::{interpolation, MaterializedShape, Track, Video, VideoRepository};

/// Application service for Video Annotation.
///
/// Orchestrates the persistence ([`VideoRepository`]) and codec
/// ([`VideoPipeline`]) ports injected by the composition root. Carries no
/// FFmpeg / filesystem / Tauri knowledge; the ingest job lifecycle (threads +
/// the `studio://activity` event) lives in the binary, which drives
/// [`VideoAppService::ingest`] through an [`IngestReporter`].
pub struct VideoAppService {
    repo: Arc<dyn VideoRepository>,
    pipeline: Arc<dyn VideoPipeline>,
    /// Root directory the binary chose for extracted-frame caches
    /// (`<app_data>/video-frames`); each video gets `frames_root/<id>`.
    frames_root: PathBuf,
}

impl VideoAppService {
    pub fn new(
        repo: Arc<dyn VideoRepository>,
        pipeline: Arc<dyn VideoPipeline>,
        frames_root: PathBuf,
    ) -> Self {
        Self {
            repo,
            pipeline,
            frames_root,
        }
    }

    /// Reported FFmpeg/CUDA availability for the UI.
    pub fn ffmpeg_info(&self) -> crate::domain::FfmpegInfo {
        self.pipeline.info()
    }

    /// Whether the `ffmpeg` binary is runnable (gates ingest).
    pub fn pipeline_available(&self) -> bool {
        self.pipeline.is_available()
    }

    // ── Videos ──────────────────────────────────────────────────────────────

    /// Import a clip: probe metadata with FFprobe (falling back to the
    /// webview-supplied values when FFmpeg is absent) and persist the record.
    pub fn import_video(&self, req: ImportVideoRequest) -> DomainResult<Video> {
        let probed = self.pipeline.probe(&req.path);

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
            id: new_id(),
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
        self.repo.upsert_video(&video)?;
        Ok(video)
    }

    /// Persist a video record (used by the binary's ingest coordinator to mark
    /// the final ready/failed status).
    pub fn persist_video(&self, video: &Video) -> DomainResult<()> {
        self.repo.upsert_video(video)
    }

    pub fn list_videos(&self, project_id: &str) -> DomainResult<Vec<Value>> {
        self.repo.list_videos(project_id)
    }

    pub fn get_video(&self, id: &str) -> DomainResult<Option<Value>> {
        self.repo.get_video(id)
    }

    /// Fetch and deserialize a video, or `None` when absent.
    pub fn get_video_typed(&self, id: &str) -> DomainResult<Option<Video>> {
        match self.repo.get_video(id)? {
            Some(value) => Ok(Some(
                serde_json::from_value(value).map_err(|e| DomainError::repository(e.to_string()))?,
            )),
            None => Ok(None),
        }
    }

    /// Delete a video: drop its extracted-frame cache, its tracks, then the row.
    pub fn delete_video(&self, id: &str) -> DomainResult<()> {
        self.pipeline.clear_frame_cache(&self.frames_root.join(id));
        self.repo.delete_tracks_for_video(id)?;
        self.repo.delete_video(id)?;
        Ok(())
    }

    // ── Ingest (driven on a binary worker thread) ───────────────────────────

    /// Run the extract + scene-detect pass, reporting progress through
    /// `reporter`. Mutates `video` in place with the results (the caller
    /// persists the final ready/failed state).
    pub fn ingest(
        &self,
        req: &IngestRequest,
        video: &mut Video,
        reporter: &mut dyn IngestReporter,
    ) -> DomainResult<()> {
        let sample_fps = req.sample_fps.unwrap_or(2.0).clamp(0.25, 10.0);
        let threshold = req.scene_threshold.unwrap_or(0.4).clamp(0.05, 0.95);
        let use_cuda = req.use_cuda.unwrap_or(true) && self.pipeline.has_cuda();

        video.status = "processing".into();
        self.repo.upsert_video(video)?;

        // ── Frame extraction (2%..70%) ──────────────────────────────────────
        let frames_dir = self.frames_root.join(&video.id);
        let frames = self.pipeline.extract_frames(
            &video.path,
            &frames_dir,
            sample_fps,
            240,
            video.duration,
            video.fps,
            use_cuda,
            &mut |fraction| reporter.progress("Extracting frames", 0.02 + fraction * 0.68),
        )?;
        // Let the asset protocol serve the extracted frames to the webview.
        reporter.frames_ready(&frames_dir);

        // ── Scene detection (70%..95%) ──────────────────────────────────────
        reporter.progress("Detecting scenes", 0.72);
        let scene_cuts = self
            .pipeline
            .detect_scenes(&video.path, video.fps, threshold, use_cuda)?;

        // ── Stage results onto the video (caller persists) ──────────────────
        reporter.progress("Saving", 0.97);
        video.sample_fps = sample_fps;
        video.frames_dir = frames_dir.to_string_lossy().to_string();
        video.frames = frames;
        video.scene_cuts = scene_cuts;
        Ok(())
    }

    // ── Tracks ──────────────────────────────────────────────────────────────

    pub fn save_track(&self, mut track: Track) -> DomainResult<Track> {
        if track.id.is_empty() {
            track.id = new_id();
        }
        if track.created_at.is_empty() {
            track.created_at = now_iso();
        }
        track.updated_at = now_iso();
        track.keyframes.sort_by_key(|kf| kf.frame);

        self.repo.upsert_track(&track)?;
        Ok(track)
    }

    pub fn list_tracks(&self, video_id: &str) -> DomainResult<Vec<Value>> {
        self.repo.list_tracks(video_id)
    }

    pub fn delete_track(&self, id: &str) -> DomainResult<()> {
        self.repo.delete_track(id)
    }

    // ── Export / materialization ────────────────────────────────────────────

    /// Resolve every track's interpolated shape across a frame range — sparse
    /// keyframe tracks → dense per-frame annotations for export.
    pub fn export_tracks(
        &self,
        req: ExportTracksRequest,
    ) -> DomainResult<Vec<MaterializedShape>> {
        let video = self
            .get_video_typed(&req.video_id)?
            .ok_or_else(|| DomainError::not_found("Video"))?;

        let start = req.start_frame.unwrap_or(0).max(0);
        let end = req
            .end_frame
            .unwrap_or_else(|| (video.frame_count - 1).max(0));
        let step = req.step.unwrap_or(1).max(1);

        let track_values = self.repo.list_tracks(&req.video_id)?;
        let mut out = Vec::new();
        for value in track_values {
            let track: Track =
                serde_json::from_value(value).map_err(|e| DomainError::repository(e.to_string()))?;
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
