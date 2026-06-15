//! `vailabel-db` — the shared SQLite connection.
//!
//! VaiLabel Studio uses a single SQLite database. In a modular monolith the
//! *connection* is therefore shared infrastructure: per-module Diesel
//! repositories and the residual central store all borrow the same handle so
//! reads/writes are serialized through one connection. This crate owns nothing
//! domain-specific — no table schemas live here; each module declares its own
//! `diesel::table!` and runs typed queries against the borrowed connection.
//!
//! `diesel` is re-exported (`vailabel_db::diesel`) so every module crate pins
//! the exact same diesel version as the connection handle.

use std::path::Path;
use std::sync::{Arc, Mutex, MutexGuard};

use diesel::connection::Connection;
use diesel::sqlite::SqliteConnection;
use diesel::RunQueryDsl;
use thiserror::Error;

pub use diesel;

/// Errors from the shared connection.
#[derive(Debug, Error)]
pub enum DbError {
    /// Failed to establish the SQLite connection.
    #[error("database connection error: {0}")]
    Connection(#[from] diesel::ConnectionError),
    /// A query against the connection failed.
    #[error("database error: {0}")]
    Diesel(#[from] diesel::result::Error),
    /// The connection mutex was poisoned by a panicking holder.
    #[error("database connection mutex poisoned")]
    Poisoned,
}

/// A cloneable handle to the one shared SQLite connection.
///
/// Cloning is cheap (`Arc`); every clone refers to the same underlying
/// connection guarded by a `Mutex`, so concurrent callers serialize.
#[derive(Clone)]
pub struct Db(Arc<Mutex<SqliteConnection>>);

// SAFETY: diesel's `SqliteConnection` is `!Send`/`!Sync` (it owns a raw sqlite
// pointer), but it is only ever accessed here while the `Mutex` is held, which
// guarantees exclusive, single-threaded access at any instant. This is the same
// soundness argument the binary's `DesktopStore` relied on with its
// `unsafe impl Send`. The connection is never moved or aliased outside the lock.
unsafe impl Send for Db {}
unsafe impl Sync for Db {}

// Compile-time proof the handle is shareable across threads (held by the Tauri
// managed state and by per-module repositories behind `Arc<dyn …>`).
const _: fn() = || {
    fn assert_send_sync<T: Send + Sync>() {}
    assert_send_sync::<Db>();
};

impl Db {
    /// Open (or create) the database at `path`, applying the app's standard
    /// PRAGMAs (`journal_mode=WAL`, `foreign_keys=ON`) before any query runs.
    pub fn open(path: impl AsRef<Path>) -> Result<Self, DbError> {
        let url = path.as_ref().to_string_lossy().to_string();
        let mut conn = SqliteConnection::establish(&url)?;
        diesel::sql_query("PRAGMA journal_mode=WAL").execute(&mut conn)?;
        diesel::sql_query("PRAGMA foreign_keys=ON").execute(&mut conn)?;
        Ok(Self(Arc::new(Mutex::new(conn))))
    }

    /// Wrap an already-established connection (e.g. an in-memory test db).
    pub fn from_connection(conn: SqliteConnection) -> Self {
        Self(Arc::new(Mutex::new(conn)))
    }

    /// Lock the connection for exclusive use.
    ///
    /// Infallible at the call site (panics only if a previous holder panicked
    /// while holding the lock), mirroring the prior `RefCell::borrow_mut`
    /// ergonomics so existing `&mut *store.conn()` call sites are unchanged.
    pub fn lock(&self) -> MutexGuard<'_, SqliteConnection> {
        self.0.lock().expect("vailabel-db connection mutex poisoned")
    }

    /// Run `f` with exclusive `&mut` access, mapping a diesel error into
    /// [`DbError`]. Preferred by module repositories for clean error handling.
    pub fn with_conn<T>(
        &self,
        f: impl FnOnce(&mut SqliteConnection) -> Result<T, diesel::result::Error>,
    ) -> Result<T, DbError> {
        let mut guard = self.0.lock().map_err(|_| DbError::Poisoned)?;
        f(&mut guard).map_err(DbError::Diesel)
    }
}
