//! The Annotation application layer: CQRS commands/queries and the label
//! use-case service.

pub mod commands;
pub mod queries;
pub mod service;

pub use commands::{DeleteLabelCommand, SaveLabelCommand};
pub use queries::{GetLabelQuery, ListLabelsByProjectQuery};
pub use service::LabelClassAppService;
