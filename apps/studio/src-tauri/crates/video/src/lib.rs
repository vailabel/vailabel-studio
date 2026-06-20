//! `vailabel-video` — the Video Annotation module.
//!
//! Domain types for Phase 5 Video Annotation: video metadata, CVAT-style
//! keyframe [`domain::Track`]s (only keyframes are stored; other frames are
//! interpolated by the binary's `interpolation` module), the ingest-job
//! progress envelope, and request DTOs. The frontend mirror lives in
//! `src/types/video.ts`; field names are camelCase so the same JSON crosses IPC
//! unchanged.
//!
//! Heavy video work (decode, frame extraction, scene detection) shells out to
//! the FFmpeg CLI; that lives behind the [`application::VideoPipeline`] port,
//! implemented in [`infrastructure`] (the only layer allowed `std::process` /
//! `std::fs`). Persistence is the [`domain::VideoRepository`] port, implemented
//! by the binary over its store. The ingest job lifecycle (threads + the unified
//! `studio://activity` Tauri event) stays in the binary, driving the crate's
//! [`application::VideoAppService`] through the [`application::IngestReporter`]
//! port.

pub mod application;
pub mod contracts;
pub mod domain;
pub mod infrastructure;
