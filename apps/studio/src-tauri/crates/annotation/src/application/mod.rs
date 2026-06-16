//! The Annotation application layer: CQRS commands/queries and the use-case
//! services for label classes and annotations.

pub mod commands;
pub mod queries;
pub mod service;

pub use commands::{
    DeleteAnnotationCommand, DeleteLabelCommand, SaveAnnotationCommand, SaveLabelCommand,
};
pub use queries::{
    GetLabelQuery, ListAnnotationsByImageQuery, ListAnnotationsByProjectQuery,
    ListLabelsByProjectQuery,
};
pub use service::{AnnotationAppService, LabelClassAppService};
