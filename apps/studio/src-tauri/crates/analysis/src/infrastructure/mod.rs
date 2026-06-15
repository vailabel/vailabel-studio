//! The infrastructure layer: the `image`-crate pixel decoder implementing the
//! [`crate::application::ImageDecoder`] port. The only layer that reads image
//! files.

pub mod decoder;

pub use decoder::ImageQualityDecoder;
