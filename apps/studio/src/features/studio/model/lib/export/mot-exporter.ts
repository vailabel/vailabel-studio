import type { Annotation, Label } from "@/shared/types/core"
import type { Track, VideoMeta } from "@/shared/types/video"
import { sampleTrackAt, shapeToRect } from "@/features/studio/model/lib/video/track-engine"
import { baseName } from "./geometry"
import { buildCategoryIndex } from "./categories"

export interface MotVideo {
  meta: Pick<VideoMeta, "name" | "fps" | "width" | "height" | "frameCount">
  tracks: Track[]
}

export interface MotFile {
  /** Path relative to the export folder, e.g. `clip/gt/gt.txt`. */
  name: string
  content: string
}

const num = (value: number) => Number(value.toFixed(2)).toString()

// Frames to sample: the whole clip, or up to the last keyframe when the probe
// didn't report a frame count.
function frameCountOf(video: MotVideo): number {
  if (video.meta.frameCount > 0) return video.meta.frameCount
  const last = video.tracks.flatMap((track) => track.keyframes.map((kf) => kf.frame))
  return last.length > 0 ? Math.max(...last) + 1 : 0
}

/**
 * MOTChallenge ground truth per video: `<video>/gt/gt.txt`, `<video>/gt/labels.txt`
 * and `<video>/seqinfo.ini`. Each gt row is
 * `frame,id,left,top,width,height,conf,class,visibility` with 1-based frames,
 * integer track ids (1-based, in track order) and 1-based class ids indexing
 * `labels.txt`. Interpolated frames are materialized via the track engine;
 * occluded frames get visibility 0.
 */
export function toMot(videos: MotVideo[], labels: Label[]): MotFile[] {
  const files: MotFile[] = []

  for (const video of videos) {
    const dir = baseName(video.meta.name)
    // Track label names stand in for annotation names in the category index.
    const categories = buildCategoryIndex(
      labels,
      video.tracks.map((track) => ({ name: track.labelName }) as Annotation)
    )
    const frames = frameCountOf(video)
    const rows: string[] = []

    for (let frame = 0; frame < frames; frame++) {
      video.tracks.forEach((track, index) => {
        const sampled = sampleTrackAt(track, frame)
        if (!sampled || sampled.shape.length === 0) return
        const rect = shapeToRect(sampled.shape)
        const classId = categories.indexOf(track.labelName) + 1
        rows.push(
          [
            frame + 1,
            index + 1,
            num(rect.x),
            num(rect.y),
            num(rect.width),
            num(rect.height),
            1,
            classId,
            sampled.occluded ? 0 : 1,
          ].join(",")
        )
      })
    }

    files.push(
      { name: `${dir}/gt/gt.txt`, content: rows.length ? `${rows.join("\n")}\n` : "" },
      { name: `${dir}/gt/labels.txt`, content: `${categories.names.join("\n")}\n` },
      {
        name: `${dir}/seqinfo.ini`,
        content: [
          "[Sequence]",
          `name=${dir}`,
          "imDir=img1",
          `frameRate=${num(video.meta.fps)}`,
          `seqLength=${frames}`,
          `imWidth=${video.meta.width}`,
          `imHeight=${video.meta.height}`,
          "imExt=.jpg",
          "",
        ].join("\n"),
      }
    )
  }

  return files
}
