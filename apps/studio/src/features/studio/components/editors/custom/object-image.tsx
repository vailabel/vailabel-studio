import { memo, useMemo, useState } from "react"
import { toAssetUrl } from "@/shared/lib/desktop"
import type { Item } from "@/shared/types/core"
import type { ControlTag } from "@/shared/lib/label-config/types"
import type { StoredResult } from "@/shared/lib/label-config/result"
import { RegionSurface } from "./region-surface"
import { RegionToolbar } from "./region-toolbar"
import { needsRegionToolbar, useRegionTools } from "./region-tools"
import type { RasterSize } from "./use-brush-draw"

interface ObjectImageProps {
  doc: Item
  /** Spatial controls bound to this image (shapes and brushes). */
  controls: ControlTag[]
  resultsByControl: Record<string, StoredResult[]>
  onCreateRegion: (
    control: ControlTag,
    value: Record<string, unknown>,
    color: string
  ) => void
  onDeleteRegion: (annotationId: string) => void
}

export const ObjectImage = memo(
  ({ doc, controls, resultsByControl, onCreateRegion, onDeleteRegion }: ObjectImageProps) => {
    const tools = useRegionTools(controls)
    const [size, setSize] = useState<RasterSize | null>(null)
    const src = useMemo(() => toAssetUrl(doc.path), [doc.path])

    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {needsRegionToolbar(tools) && <RegionToolbar tools={tools} />}

        <div className="min-h-0 flex-1 overflow-auto p-4">
          <RegionSurface
            tools={tools}
            resultsByControl={resultsByControl}
            size={size}
            onCreateRegion={onCreateRegion}
            onDeleteRegion={onDeleteRegion}
            className="mx-auto w-full max-w-4xl"
          >
            <img
              src={src}
              alt={doc.name}
              draggable={false}
              onLoad={(event) =>
                setSize({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                })
              }
              className="block w-full rounded"
            />
          </RegionSurface>
        </div>
      </div>
    )
  }
)

ObjectImage.displayName = "ObjectImage"
