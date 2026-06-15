//! The event-publishing port and the in-process event bus.

use crate::error::PortError;
use serde_json::Value;
use std::sync::Arc;

/// Port for publishing domain events outward (UI refresh, audit, integrations).
///
/// Application services depend on this trait rather than on a concrete bus or on
/// Tauri. The `(entity, action, payload)` shape mirrors the existing
/// `emit_domain_event(app, entity, action, &value)` call so a subscriber can be
/// a direct pass-through.
pub trait EventPublisher: Send + Sync {
    /// Publish that `action` (e.g. `"created"`, `"updated"`, `"deleted"`)
    /// happened to an entity of type `entity` (e.g. `"projects"`), carrying the
    /// affected entity's JSON `payload`.
    fn publish(&self, entity: &str, action: &str, payload: &Value) -> Result<(), PortError>;
}

/// A handler that reacts to a published domain event — a UI emitter, an audit
/// log, a future integration. Multiple subscribers are registered on an
/// [`EventBus`]; the domain/application stays unaware of which (or how many).
pub trait EventSubscriber: Send + Sync {
    /// React to one published event.
    fn handle(&self, entity: &str, action: &str, payload: &Value) -> Result<(), PortError>;
}

/// Fans a published event out to every registered [`EventSubscriber`].
///
/// `EventBus` *is* an [`EventPublisher`], so application services keep depending
/// on the port while the composition root decides the subscriber set. Dispatch
/// is **fail-fast**: the first subscriber error aborts the publish (preserving
/// the prior single-subscriber behavior, where a Tauri emit failure propagated).
pub struct EventBus {
    subscribers: Vec<Arc<dyn EventSubscriber>>,
}

impl EventBus {
    /// Build a bus over the given subscribers (registered at the composition root).
    pub fn new(subscribers: Vec<Arc<dyn EventSubscriber>>) -> Self {
        Self { subscribers }
    }
}

impl EventPublisher for EventBus {
    fn publish(&self, entity: &str, action: &str, payload: &Value) -> Result<(), PortError> {
        for subscriber in &self.subscribers {
            subscriber.handle(entity, action, payload)?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};

    struct Counting(Arc<AtomicUsize>);
    impl EventSubscriber for Counting {
        fn handle(&self, _entity: &str, _action: &str, _payload: &Value) -> Result<(), PortError> {
            self.0.fetch_add(1, Ordering::SeqCst);
            Ok(())
        }
    }

    struct Failing;
    impl EventSubscriber for Failing {
        fn handle(&self, _entity: &str, _action: &str, _payload: &Value) -> Result<(), PortError> {
            Err(PortError::new("boom"))
        }
    }

    #[test]
    fn publish_fans_out_to_every_subscriber() {
        let a = Arc::new(AtomicUsize::new(0));
        let b = Arc::new(AtomicUsize::new(0));
        let bus = EventBus::new(vec![
            Arc::new(Counting(a.clone())),
            Arc::new(Counting(b.clone())),
        ]);
        bus.publish("projects", "created", &serde_json::json!({ "id": "p1" }))
            .unwrap();
        assert_eq!(a.load(Ordering::SeqCst), 1);
        assert_eq!(b.load(Ordering::SeqCst), 1);
    }

    #[test]
    fn publish_is_fail_fast() {
        let reached = Arc::new(AtomicUsize::new(0));
        let bus = EventBus::new(vec![
            Arc::new(Failing),
            Arc::new(Counting(reached.clone())),
        ]);
        assert!(bus
            .publish("x", "y", &serde_json::json!({}))
            .is_err());
        // The subscriber after the failing one is never reached.
        assert_eq!(reached.load(Ordering::SeqCst), 0);
    }
}
