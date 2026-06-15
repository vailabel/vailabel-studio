//! Paging value types shared by query contracts.

use serde::{Deserialize, Serialize};

/// A request for one page of results. `page` is zero-based.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct PageRequest {
    /// Zero-based page index.
    pub page: u32,
    /// Number of items per page.
    pub size: u32,
}

impl PageRequest {
    /// Construct a page request.
    pub fn new(page: u32, size: u32) -> Self {
        Self { page, size }
    }

    /// The zero-based offset of the first item on this page.
    pub fn offset(&self) -> u64 {
        u64::from(self.page) * u64::from(self.size)
    }
}

/// One page of results plus the total count across all pages.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PagedResult<T> {
    /// The items on this page.
    pub items: Vec<T>,
    /// Total number of items across all pages.
    pub total: u64,
    /// Zero-based index of this page.
    pub page: u32,
    /// Page size used for this result.
    pub size: u32,
}

impl<T> PagedResult<T> {
    /// Build a paged result from the items, the overall total, and the request
    /// that produced it.
    pub fn new(items: Vec<T>, total: u64, request: PageRequest) -> Self {
        Self {
            items,
            total,
            page: request.page,
            size: request.size,
        }
    }
}
