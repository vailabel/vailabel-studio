import type { Annotation, Item } from "@/shared/types/core"
import type { LabelConfig } from "@/shared/lib/label-config/types"
import type { Track, VideoMeta } from "@/shared/types/video"
import { toLabelStudioResults } from "@/shared/lib/label-config/result"
import { shapeToRect } from "@/features/studio/model/lib/video/track-engine"
import { taskData } from "./task-data"

export interface LabelStudioTask {
  data: Record<string, unknown>
  annotations: Array<{ result: Array<Record<string, unknown>> }>
}

/** Label Studio tasks for item-based projects: the item's task data plus its
 *  config-driven results. */
export function toLabelStudioTasks(
  items: Item[],
  annotationsByItem: Map<string, Annotation[]>,
  config?: LabelConfig
): LabelStudioTask[] {
  return items.map((item) => ({
    data: taskData(item, config),
    annotations: [
      { result: toLabelStudioResults(annotationsByItem.get(item.id) || []) },
    ],
  }))
}

export interface LabelStudioVideo {
  meta: Pick<VideoMeta, "path" | "fps" | "duration" | "width" | "height" | "frameCount">
  tracks: Track[]
}

const percent = (value: number, total: number) =>
  total > 0 ? (value / total) * 100 : 0

/**
 * Label Studio video tasks: one task per clip, one `videorectangle` result per
 * track. The sequence holds the track's keyframes (Label Studio interpolates
 * between them) with 1-based frames and percent coordinates; an `outside`
 * keyframe is written as `enabled: false`. Names come from the project's
 * `<Video>` / `<VideoRectangle>` tags when configured.
 */
export function toLabelStudioVideoTasks(
  videos: LabelStudioVideo[],
  config?: LabelConfig
): LabelStudioTask[] {
  const object = config?.objects.find((entry) => entry.tag === "video")
  const control = config?.controls.find((entry) => entry.tag === "videorectangle")
  const toName = object?.name ?? control?.toName ?? "video"
  const fromName = control?.name ?? "box"
  const dataKey = object?.valueKey || "video"

  return videos.map(({ meta, tracks }) => ({
    data: { [dataKey]: meta.path },
    annotations: [
      {
        result: tracks.map((track) => ({
          id: track.id,
          from_name: fromName,
          to_name: toName,
          type: "videorectangle",
          origin: "manual",
          value: {
            framesCount: meta.frameCount,
            duration: meta.duration,
            labels: [track.labelName],
            sequence: [...track.keyframes]
              .sort((a, b) => a.frame - b.frame)
              .map((keyframe) => {
                const rect = shapeToRect(keyframe.shape)
                return {
                  frame: keyframe.frame + 1,
                  enabled: !keyframe.outside,
                  rotation: 0,
                  x: percent(rect.x, meta.width),
                  y: percent(rect.y, meta.height),
                  width: percent(rect.width, meta.width),
                  height: percent(rect.height, meta.height),
                  time: meta.fps > 0 ? keyframe.frame / meta.fps : 0,
                }
              }),
          },
        })),
      },
    ],
  }))
}
