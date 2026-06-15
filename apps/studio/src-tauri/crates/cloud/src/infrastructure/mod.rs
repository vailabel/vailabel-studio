//! The infrastructure layer: the OpenDAL-backed object store. The only layer
//! allowed to touch `opendal::` and `std::fs`.

pub mod operator;

pub use operator::OpenDalFactory;
