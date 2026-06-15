//! The Video application layer: the use-case service plus the ports it
//! orchestrates (the FFmpeg pipeline and the ingest progress reporter), injected
//! by the composition root. No FFmpeg / filesystem / Tauri knowledge.

pub mod ports;
pub mod service;

pub use ports::{IngestReporter, VideoPipeline};
pub use service::VideoAppService;
