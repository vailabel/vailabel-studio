//! The Annotation domain layer.

pub mod events;
pub mod label_class;
pub mod repository;

pub use events::LabelEvent;
pub use label_class::LabelClass;
pub use repository::LabelRepository;
