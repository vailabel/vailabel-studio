//! Re-export shim.
//!
//! The video annotation data model and request payloads now live in the
//! `vailabel-video` crate (`domain` / `contracts`). This shim keeps
//! `crate::domain::video::model::*` valid for the video service, ffmpeg, and
//! interpolation code that remain in the binary. `now_iso` in `VideoJob::new`
//! now resolves `vailabel_shared::now_iso` (same implementation).

pub use vailabel_video::contracts::*;
pub use vailabel_video::domain::*;
