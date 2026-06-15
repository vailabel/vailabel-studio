//! Composition-root adapter: the `vailabel-video` persistence port over the
//! residual `DesktopStore` (the JSON-blob `videos` / `tracks` tables). Keeping
//! the store here — rather than moving the tables into the crate — means the
//! video migration is logic-only and low-risk; the crate stays unaware of
//! Diesel/SQLite.

use std::sync::{Arc, Mutex, MutexGuard};

use serde_json::Value;
use vailabel_core::{DomainError, DomainResult};
use vailabel_video::domain::{Track, Video, VideoRepository};

use crate::store::DesktopStore;

/// Map any store failure into the domain's repository variant.
fn repo(error: impl ToString) -> DomainError {
    DomainError::repository(error.to_string())
}

pub struct VideoStoreRepository {
    store: Arc<Mutex<DesktopStore>>,
}

impl VideoStoreRepository {
    pub fn new(store: Arc<Mutex<DesktopStore>>) -> Self {
        Self { store }
    }

    fn guard(&self) -> DomainResult<MutexGuard<'_, DesktopStore>> {
        self.store
            .lock()
            .map_err(|_| DomainError::repository("Desktop store is unavailable"))
    }
}

impl VideoRepository for VideoStoreRepository {
    fn upsert_video(&self, video: &Video) -> DomainResult<()> {
        let json = serde_json::to_string(video).map_err(repo)?;
        self.guard()?
            .upsert_video(
                &video.id,
                &video.project_id,
                &video.created_at,
                &video.updated_at,
                &json,
            )
            .map_err(repo)
    }

    fn list_videos(&self, project_id: &str) -> DomainResult<Vec<Value>> {
        self.guard()?.list_videos(project_id).map_err(repo)
    }

    fn get_video(&self, id: &str) -> DomainResult<Option<Value>> {
        self.guard()?.get_video(id).map_err(repo)
    }

    fn delete_video(&self, id: &str) -> DomainResult<()> {
        self.guard()?.delete_video(id).map_err(repo)
    }

    fn upsert_track(&self, track: &Track) -> DomainResult<()> {
        let json = serde_json::to_string(track).map_err(repo)?;
        self.guard()?
            .upsert_track(
                &track.id,
                &track.video_id,
                &track.project_id,
                &track.created_at,
                &track.updated_at,
                &json,
            )
            .map_err(repo)
    }

    fn list_tracks(&self, video_id: &str) -> DomainResult<Vec<Value>> {
        self.guard()?.list_tracks(video_id).map_err(repo)
    }

    fn delete_track(&self, id: &str) -> DomainResult<()> {
        self.guard()?.delete_track(id).map_err(repo)
    }

    fn delete_tracks_for_video(&self, video_id: &str) -> DomainResult<()> {
        self.guard()?.delete_tracks_for_video(video_id).map_err(repo)
    }
}
