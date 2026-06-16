//! The Training application layer: commands, the runtime port, and (in a later
//! step) the use-case service.

pub mod commands;
pub mod ports;
pub mod service;

pub use commands::{StartTrainingCommand, StopTrainingCommand, SyncTrainingUpdate};
pub use ports::{TrainingRuntime, TrainingStartReq};
pub use service::TrainingAppService;
