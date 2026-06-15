//! `vailabel-video` — the Video Annotation module.
//!
//! Domain types for Phase 5 Video Annotation: video metadata, CVAT-style
//! keyframe [`domain::Track`]s (only keyframes are stored; other frames are
//! interpolated by the binary's `interpolation` module), the ingest-job
//! progress envelope, and request DTOs. The frontend mirror lives in
//! `src/types/video.ts`; field names are camelCase so the same JSON crosses IPC
//! unchanged.
//!
//! All heavy video work (decode, frame extraction, scene detection) runs in the
//! binary by shelling out to FFmpeg — this crate holds only the pure data model.

pub mod contracts;
pub mod domain;
