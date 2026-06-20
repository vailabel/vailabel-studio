//! Cross-cutting kernel for the Tauri shell: JSON entity helpers, domain-event
//! emission, the keychain secret helpers, and the composition-root event
//! subscriber + domain→transport error bridge. The crate root re-exports the
//! common items so feature slices keep using `crate::now_iso`, `crate::emit_domain_event`, …

pub mod activity;
pub mod composition;
pub mod entity;
pub mod events;
pub mod secrets;

pub use activity::{emit_activity, ActivityEvent};
pub use entity::now_iso;
pub use events::emit_domain_event;
pub(crate) use entity::{as_object_mut, merge_patch, value_string};
pub(crate) use events::emit_domain_event_for_ids;
pub(crate) use secrets::read_secret;
