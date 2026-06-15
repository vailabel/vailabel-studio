//! Ports the video use cases depend on. The composition root implements these
//! over the FFmpeg CLI (pipeline) and the Tauri event channel (reporter); the
//! application layer stays unaware of both.

use std::path::Path;

use vailabel_core::DomainResult;

use crate::domain::{FfmpegInfo, FrameThumb, ProbeResult, SceneCut};

/// The codec layer: FFmpeg/FFprobe availability, metadata probing, filmstrip
/// extraction, and scene detection. Implemented in `infrastructure` by shelling
/// out to the `ffmpeg`/`ffprobe` binaries.
pub trait VideoPipeline: Send + Sync {
    /// Report FFmpeg / FFprobe / CUDA availability for the UI.
    fn info(&self) -> FfmpegInfo;

    /// Is the `ffmpeg` binary runnable?
    fn is_available(&self) -> bool;

    /// Is CUDA hardware decode advertised?
    fn has_cuda(&self) -> bool;

    /// Read duration / fps / dimensions / frame count, or `None` if probing
    /// fails (e.g. FFprobe absent — callers fall back to webview-supplied values).
    fn probe(&self, path: &str) -> Option<ProbeResult>;

    /// Extract a downscaled filmstrip at `sample_fps` into `out_dir`, reporting
    /// determinate progress `[0,1]` through `on_progress`.
    #[allow(clippy::too_many_arguments)]
    fn extract_frames(
        &self,
        path: &str,
        out_dir: &Path,
        sample_fps: f64,
        max_edge: i64,
        duration: f64,
        src_fps: f64,
        use_cuda: bool,
        on_progress: &mut dyn FnMut(f64),
    ) -> DomainResult<Vec<FrameThumb>>;

    /// Detect scene cuts (the first frame always opens scene 0).
    fn detect_scenes(
        &self,
        path: &str,
        fps: f64,
        threshold: f64,
        use_cuda: bool,
    ) -> DomainResult<Vec<SceneCut>>;

    /// Best-effort removal of a video's extracted-frame cache directory.
    fn clear_frame_cache(&self, frames_dir: &Path);
}

/// Receives ingest progress so the binary can stream it to the webview and grant
/// the asset-protocol scope for the extracted frames. Implemented at the
/// composition root (the crate never touches Tauri).
pub trait IngestReporter {
    /// A stage label + overall progress `[0,1]` update.
    fn progress(&mut self, stage: &str, progress: f64);

    /// The filmstrip is on disk at `frames_dir` — grant the webview read access.
    fn frames_ready(&mut self, frames_dir: &Path);
}
