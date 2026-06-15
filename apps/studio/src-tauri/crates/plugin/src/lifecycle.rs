//! The plugin lifecycle contract.

use vailabel_core::DomainResult;

/// The lifecycle a plugin manager drives a plugin through:
/// `install → load → enable ⇄ disable → unload`.
///
/// Each transition returns [`DomainResult`] so failures surface in domain terms
/// (e.g. a missing artifact becomes `DomainError::NotFound`). The framework is
/// pure; the host (composition root) decides *when* to call these.
pub trait PluginLifecycle {
    /// Acquire/verify the plugin's artifacts on disk.
    fn install(&mut self) -> DomainResult<()>;

    /// Load the plugin into the process (allocate models, sessions, …).
    fn load(&mut self) -> DomainResult<()>;

    /// Begin accepting work.
    fn enable(&mut self) -> DomainResult<()>;

    /// Stop accepting work without unloading.
    fn disable(&mut self) -> DomainResult<()>;

    /// Release the plugin's in-process resources.
    fn unload(&mut self) -> DomainResult<()>;
}
