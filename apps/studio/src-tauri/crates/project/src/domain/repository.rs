//! The Project persistence contract.

use super::project::Project;
use vailabel_core::Repository;

/// Persistence contract for the `Project` aggregate.
///
/// A named marker over [`vailabel_core::Repository<Project>`] (with a blanket
/// impl) so application code can depend on `dyn ProjectRepository` while any
/// `Repository<Project>` implementation — e.g. the infrastructure
/// `JsonRepository<Project>` — satisfies it automatically.
pub trait ProjectRepository: Repository<Project> {}

impl<T> ProjectRepository for T where T: Repository<Project> {}
