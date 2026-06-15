//! Platform-specific child-process teardown.
//!
//! Both backends guarantee the runtime (and any worker subprocess it forks for
//! training/export) dies with the app:
//! - Windows: a Job Object with `KILL_ON_JOB_CLOSE` — the OS kills the whole
//!   tree when the held handle closes, even if the app crashes without Drop.
//! - Unix: the child leads its own process group (`setsid`); teardown signals
//!   the negative pgid.

#[cfg(windows)]
mod windows;
#[cfg(windows)]
pub use windows::{assign_to_guard, configure_command, ProcessGuard};

#[cfg(unix)]
mod unix;
#[cfg(unix)]
pub use unix::{assign_to_guard, configure_command, ProcessGuard};
