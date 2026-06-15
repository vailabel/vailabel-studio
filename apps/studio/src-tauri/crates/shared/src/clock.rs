//! Wall-clock access.

/// The current UTC time as an RFC 3339 string.
///
/// This is the single source of truth for timestamp formatting across the
/// workspace. It is intentionally identical to the binary's historical
/// `now_iso` (`chrono::Utc::now().to_rfc3339()`) so that moving entity models
/// into crates does not change any stored/serialized timestamp format.
pub fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

/// An injectable clock, so application logic that stamps times can be tested
/// deterministically instead of reading the real wall clock.
pub trait Clock: Send + Sync {
    /// The current time as an RFC 3339 string.
    fn now_iso(&self) -> String;
}

/// The production [`Clock`]: reads the real system clock via [`now_iso`].
#[derive(Debug, Clone, Copy, Default)]
pub struct SystemClock;

impl Clock for SystemClock {
    fn now_iso(&self) -> String {
        now_iso()
    }
}
