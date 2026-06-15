//! The video persistence port.
//!
//! Videos and tracks are stored as JSON blobs (the frontend mirror is the source
//! of truth for the shape). The binary implements this over its residual
//! `DesktopStore`; the crate stays unaware of Diesel/SQLite. Reads return the raw
//! stored [`Value`] so the JSON crossing IPC is byte-identical to what was saved.

use serde_json::Value;
use vailabel_core::DomainResult;

use super::{Track, Video};

/// Persistence for [`Video`]s and their [`Track`]s.
pub trait VideoRepository: Send + Sync {
    /// Create or replace a video record.
    fn upsert_video(&self, video: &Video) -> DomainResult<()>;

    /// All videos in a project, newest first (raw stored JSON).
    fn list_videos(&self, project_id: &str) -> DomainResult<Vec<Value>>;

    /// One video by id (raw stored JSON), or `None`.
    fn get_video(&self, id: &str) -> DomainResult<Option<Value>>;

    /// Delete a video record (tracks are removed separately).
    fn delete_video(&self, id: &str) -> DomainResult<()>;

    /// Create or replace a track record.
    fn upsert_track(&self, track: &Track) -> DomainResult<()>;

    /// All tracks for a video, oldest first (raw stored JSON).
    fn list_tracks(&self, video_id: &str) -> DomainResult<Vec<Value>>;

    /// Delete one track by id.
    fn delete_track(&self, id: &str) -> DomainResult<()>;

    /// Delete every track belonging to a video (cascade on video delete).
    fn delete_tracks_for_video(&self, video_id: &str) -> DomainResult<()>;
}
