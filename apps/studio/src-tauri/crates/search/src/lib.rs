//! `vailabel-search` — the Search module (Phase 1 boundary).
//!
//! Will own the `EmbeddingIndex` aggregate root and the use cases for semantic
//! search, image search, duplicate detection, similarity search, CLIP
//! integration, and the vector store. None of this exists yet; the layer
//! modules below establish the boundary now.

/// Entities, value objects, domain events, repository traits, errors.
pub mod domain {}
/// Commands, queries, handlers, DTOs, application services.
pub mod application {}
/// Repository implementations, mappers, adapters.
pub mod infrastructure {}
/// Public events/requests/responses other modules may depend on.
pub mod contracts {}
