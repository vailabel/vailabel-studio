//! Identifier generation and the type-tagged [`Id`] newtype.

use std::fmt;
use std::hash::{Hash, Hasher};
use std::marker::PhantomData;

/// Generate a fresh random identifier (UUID v4 as a lowercase hyphenated
/// string), matching the id format used throughout the existing store.
pub fn new_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

/// A string identifier tagged with the entity type it belongs to.
///
/// `Id<Project>` and `Id<Image>` are distinct types the compiler will not let
/// you mix up, yet both (de)serialize *transparently* as their underlying
/// string — so they are wire-compatible with the existing camelCase payloads.
/// The phantom marker uses `fn() -> T` so `Id<T>` is always `Send`/`Sync` and
/// imposes no bounds on `T`.
pub struct Id<T> {
    value: String,
    _marker: PhantomData<fn() -> T>,
}

impl<T> Id<T> {
    /// Wrap an existing identifier string.
    pub fn new(value: impl Into<String>) -> Self {
        Self {
            value: value.into(),
            _marker: PhantomData,
        }
    }

    /// Generate a fresh random id (see [`new_id`]).
    pub fn generate() -> Self {
        Self::new(new_id())
    }

    /// Borrow the underlying string.
    pub fn as_str(&self) -> &str {
        &self.value
    }

    /// Consume the id, yielding the underlying string.
    pub fn into_string(self) -> String {
        self.value
    }
}

// Manual impls: deriving would (incorrectly) require `T: Clone`/`T: PartialEq`
// because of the `PhantomData<fn() -> T>` field. The tag `T` carries no data,
// so equality/clone/hash/format all delegate to `value`.

impl<T> Clone for Id<T> {
    fn clone(&self) -> Self {
        Self::new(self.value.clone())
    }
}

impl<T> PartialEq for Id<T> {
    fn eq(&self, other: &Self) -> bool {
        self.value == other.value
    }
}

impl<T> Eq for Id<T> {}

impl<T> Hash for Id<T> {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.value.hash(state);
    }
}

impl<T> fmt::Debug for Id<T> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Id({})", self.value)
    }
}

impl<T> fmt::Display for Id<T> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.value)
    }
}

impl<T> From<String> for Id<T> {
    fn from(value: String) -> Self {
        Self::new(value)
    }
}

impl<T> From<&str> for Id<T> {
    fn from(value: &str) -> Self {
        Self::new(value)
    }
}

impl<T> serde::Serialize for Id<T> {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.value)
    }
}

impl<'de, T> serde::Deserialize<'de> for Id<T> {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        Ok(Self::new(String::deserialize(deserializer)?))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    struct Project;

    #[test]
    fn generate_is_unique_and_serializes_transparently() {
        let a: Id<Project> = Id::generate();
        let b: Id<Project> = Id::generate();
        assert_ne!(a, b);

        let json = serde_json::to_string(&a).unwrap();
        // Transparent: serializes as a bare JSON string, not an object.
        assert_eq!(json, format!("\"{}\"", a.as_str()));

        let round: Id<Project> = serde_json::from_str(&json).unwrap();
        assert_eq!(a, round);
    }
}
