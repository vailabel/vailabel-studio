//! Identity and the entity / aggregate-root / value-object vocabulary.

/// A type with a stable string identity.
///
/// This is the canonical replacement for the binary's historical `HasId`
/// trait; the signature is intentionally identical (`fn id(&self) -> &str`) so
/// the binary can alias it (`pub use vailabel_core::Identifiable as HasId;`)
/// without touching any existing `impl`/bound.
pub trait Identifiable {
    /// The entity's stable identifier.
    fn id(&self) -> &str;
}

/// A domain entity: an object defined by its identity rather than its
/// attributes. Two entities are equal iff their identities are equal.
///
/// This is a marker trait layered on [`Identifiable`]; implement it on the
/// types your domain treats as entities to document intent and to let generic
/// code bound on "an entity".
pub trait Entity: Identifiable {}

/// An aggregate root: the entry point to a consistency boundary. Repositories
/// load and persist *aggregate roots*, never their internal entities directly.
pub trait AggregateRoot: Entity {}

/// A value object: immutable, has no identity, and is compared by value.
///
/// Marker trait — implement it on small, self-validating types (coordinates,
/// colors, label names, …) to document that they carry no identity.
pub trait ValueObject {}
