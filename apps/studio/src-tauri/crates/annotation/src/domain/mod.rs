//! The Annotation domain layer.

pub mod annotation;
pub mod events;
pub mod label_class;
pub mod prediction;
pub mod repository;
pub mod wire;

pub use annotation::Annotation;
pub use events::{AnnotationEvent, LabelEvent};
pub use label_class::LabelClass;
pub use prediction::Prediction;
pub use repository::{AnnotationRepository, LabelRepository, PredictionRepository};
