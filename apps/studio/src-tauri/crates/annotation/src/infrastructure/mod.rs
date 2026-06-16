//! The Annotation infrastructure layer: typed Diesel persistence for label
//! classes, annotations, and predictions over the shared `vailabel-db`
//! connection. Only this layer touches `diesel`.

pub mod record;
pub mod repository;
pub mod schema;

pub use repository::{
    DieselAnnotationRepository, DieselLabelRepository, DieselPredictionRepository,
};
