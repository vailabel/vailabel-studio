//! The infrastructure layer: the `image`-crate pixel decoder implementing the
//! [`crate::application::ImageDecoder`] port (the only layer that reads image
//! files) and the typed-Diesel [`AnalysisRepository`] (source reads via the
//! owning module repositories; reports in the `analysis_reports` table).

pub mod decoder;
pub mod repository;

pub use decoder::ImageQualityDecoder;
pub use repository::DieselAnalysisRepository;
