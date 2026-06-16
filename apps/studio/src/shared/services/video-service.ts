import { studioCommands } from "@/shared/ipc/studio"
import type {
  ImportVideoRequest,
  IngestOptions,
  Track,
} from "@/shared/types/video"

/**
 * Video Annotation service. Import/ingest/probe run the FFmpeg pipeline in the
 * Rust backend; tracks are CVAT-style keyframe records resolved by the track
 * engine on the client.
 */
export const videoService = {
  ffmpegInfo: () => studioCommands.videoFfmpegInfo(),

  import: (request: ImportVideoRequest) => studioCommands.videoImport(request),
  list: (projectId: string) => studioCommands.videoList(projectId),
  get: (id: string) => studioCommands.videoGet(id),
  delete: (id: string) => studioCommands.videoDelete(id),

  /** Kick off the background extract + scene-detect pass. */
  ingest: (videoId: string, options: IngestOptions = {}) =>
    studioCommands.videoIngest({ videoId, ...options }),
  jobStatus: (jobId: string) => studioCommands.videoJobStatus(jobId),

  listTracks: (videoId: string) => studioCommands.videoTracksList(videoId),
  saveTrack: (track: Partial<Track>) => studioCommands.videoTrackSave(track),
  deleteTrack: (id: string) => studioCommands.videoTrackDelete(id),

  /** Materialize keyframe tracks into dense per-frame shapes for export. */
  exportTracks: (
    videoId: string,
    range?: { startFrame?: number; endFrame?: number; step?: number }
  ) => studioCommands.videoExportTracks({ videoId, ...range }),
}
