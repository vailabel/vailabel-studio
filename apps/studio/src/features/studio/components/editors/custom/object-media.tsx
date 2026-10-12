import { memo } from "react"
import type { Item } from "@/shared/types/core"
import { useMediaUrl } from "./media-source"

interface MediaProps {
  doc: Item
  valueKey?: string
}

// Viewers for objects that are looked at as a whole and scored with whole-item
// controls: there is nothing to draw on, so the platform's own player /
// document viewer does the work.

export const ObjectVideo = memo(({ doc, valueKey }: MediaProps) => (
  <div className="flex min-h-0 flex-1 items-center justify-center bg-black/90 p-4">
    <video
      controls
      src={useMediaUrl(doc, valueKey)}
      className="max-h-full max-w-full rounded"
    />
  </div>
))
ObjectVideo.displayName = "ObjectVideo"

export const ObjectPdf = memo(({ doc, valueKey }: MediaProps) => (
  <div className="min-h-0 flex-1 bg-muted p-2">
    <iframe
      title={doc.name}
      src={useMediaUrl(doc, valueKey)}
      className="h-full w-full rounded border border-border bg-white"
    />
  </div>
))
ObjectPdf.displayName = "ObjectPdf"
