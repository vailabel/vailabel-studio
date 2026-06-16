//! The infrastructure layer: the FFmpeg-CLI implementation of the
//! [`crate::application::VideoPipeline`] port (the only layer allowed
//! `std::process` / `std::fs`) and the typed-Diesel [`VideoRepository`] over the
//! shared `vailabel-db` connection.

pub mod ffmpeg;
pub mod repository;
pub mod schema;

pub use ffmpeg::FfmpegPipeline;
pub use repository::DieselVideoRepository;
