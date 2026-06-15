//! The analysis application layer: the use-case service plus the ports it
//! orchestrates (the image-pixel decoder and the progress reporter), injected by
//! the composition root. No `image`/filesystem/Tauri knowledge.

pub mod ports;
pub mod service;

pub use ports::{AnalysisReporter, ImageDecoder};
pub use service::AnalysisAppService;
