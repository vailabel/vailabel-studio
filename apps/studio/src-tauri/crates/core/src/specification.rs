//! The specification pattern — composable, reusable domain predicates.

/// A predicate over `T` expressed as a first-class domain object.
///
/// Specifications let validation/selection rules be named, reused, and combined
/// without leaking persistence concerns. Any `Fn(&T) -> bool` is automatically a
/// `Specification<T>`, so closures compose with named specs.
pub trait Specification<T> {
    /// Whether `candidate` satisfies this specification.
    fn is_satisfied_by(&self, candidate: &T) -> bool;
}

impl<T, F> Specification<T> for F
where
    F: Fn(&T) -> bool,
{
    fn is_satisfied_by(&self, candidate: &T) -> bool {
        self(candidate)
    }
}
