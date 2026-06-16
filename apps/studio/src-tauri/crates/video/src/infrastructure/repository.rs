//! Typed-Diesel implementation of [`VideoRepository`] over the shared
//! `vailabel-db` connection. Videos and tracks persist as JSON blobs keyed by
//! their indexed columns, so reads return the raw stored [`Value`] (byte-identical
//! to what was saved), matching the prior residual-store behavior.

use diesel::prelude::*;
use serde_json::Value;
use vailabel_core::{DomainError, DomainResult};
use vailabel_db::{Db, DbError};

use super::schema::{tracks, videos};
use crate::domain::{Track, Video, VideoRepository};

fn to_domain_err(err: DbError) -> DomainError {
    DomainError::repository(err.to_string())
}

fn json_err(err: impl ToString) -> DomainError {
    DomainError::repository(err.to_string())
}

#[derive(Insertable)]
#[diesel(table_name = videos)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
struct VideoRow {
    id: String,
    project_id: String,
    created_at: String,
    updated_at: String,
    video_json: String,
}

#[derive(Insertable)]
#[diesel(table_name = tracks)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
struct TrackRow {
    id: String,
    video_id: String,
    project_id: String,
    created_at: String,
    updated_at: String,
    track_json: String,
}

/// Typed-Diesel implementation of [`VideoRepository`].
pub struct DieselVideoRepository {
    db: Db,
}

impl DieselVideoRepository {
    pub fn new(db: Db) -> Self {
        Self { db }
    }
}

impl VideoRepository for DieselVideoRepository {
    fn upsert_video(&self, video: &Video) -> DomainResult<()> {
        let row = VideoRow {
            id: video.id.clone(),
            project_id: video.project_id.clone(),
            created_at: video.created_at.clone(),
            updated_at: video.updated_at.clone(),
            video_json: serde_json::to_string(video).map_err(json_err)?,
        };
        self.db
            .with_conn(|conn| {
                diesel::replace_into(videos::table)
                    .values(&row)
                    .execute(conn)?;
                Ok(())
            })
            .map_err(to_domain_err)
    }

    fn list_videos(&self, project_id: &str) -> DomainResult<Vec<Value>> {
        let project_id = project_id.to_string();
        let jsons = self
            .db
            .with_conn(move |conn| {
                Ok(videos::table
                    .filter(videos::project_id.eq(project_id))
                    .order(videos::created_at.desc())
                    .select(videos::video_json)
                    .load::<String>(conn)?)
            })
            .map_err(to_domain_err)?;
        jsons
            .iter()
            .map(|json| serde_json::from_str(json).map_err(json_err))
            .collect()
    }

    fn get_video(&self, id: &str) -> DomainResult<Option<Value>> {
        let id = id.to_string();
        let found = self
            .db
            .with_conn(move |conn| {
                Ok(videos::table
                    .find(id)
                    .select(videos::video_json)
                    .first::<String>(conn)
                    .optional()?)
            })
            .map_err(to_domain_err)?;
        match found {
            Some(json) => Ok(Some(serde_json::from_str(&json).map_err(json_err)?)),
            None => Ok(None),
        }
    }

    fn delete_video(&self, id: &str) -> DomainResult<()> {
        let id = id.to_string();
        self.db
            .with_conn(move |conn| {
                diesel::delete(videos::table.find(id)).execute(conn)?;
                Ok(())
            })
            .map_err(to_domain_err)
    }

    fn upsert_track(&self, track: &Track) -> DomainResult<()> {
        let row = TrackRow {
            id: track.id.clone(),
            video_id: track.video_id.clone(),
            project_id: track.project_id.clone(),
            created_at: track.created_at.clone(),
            updated_at: track.updated_at.clone(),
            track_json: serde_json::to_string(track).map_err(json_err)?,
        };
        self.db
            .with_conn(|conn| {
                diesel::replace_into(tracks::table)
                    .values(&row)
                    .execute(conn)?;
                Ok(())
            })
            .map_err(to_domain_err)
    }

    fn list_tracks(&self, video_id: &str) -> DomainResult<Vec<Value>> {
        let video_id = video_id.to_string();
        let jsons = self
            .db
            .with_conn(move |conn| {
                Ok(tracks::table
                    .filter(tracks::video_id.eq(video_id))
                    .order(tracks::created_at.asc())
                    .select(tracks::track_json)
                    .load::<String>(conn)?)
            })
            .map_err(to_domain_err)?;
        jsons
            .iter()
            .map(|json| serde_json::from_str(json).map_err(json_err))
            .collect()
    }

    fn delete_track(&self, id: &str) -> DomainResult<()> {
        let id = id.to_string();
        self.db
            .with_conn(move |conn| {
                diesel::delete(tracks::table.find(id)).execute(conn)?;
                Ok(())
            })
            .map_err(to_domain_err)
    }

    fn delete_tracks_for_video(&self, video_id: &str) -> DomainResult<()> {
        let video_id = video_id.to_string();
        self.db
            .with_conn(move |conn| {
                diesel::delete(tracks::table.filter(tracks::video_id.eq(video_id)))
                    .execute(conn)?;
                Ok(())
            })
            .map_err(to_domain_err)
    }
}
