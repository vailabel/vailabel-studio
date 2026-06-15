//! The infrastructure layer: the FFmpeg-CLI implementation of the
//! [`crate::application::VideoPipeline`] port. The only layer allowed
//! `std::process` / `std::fs`.

pub mod ffmpeg;

pub use ffmpeg::FfmpegPipeline;
