import { useCallback, useMemo, useState } from "react"
import type { ControlTag } from "@/shared/lib/label-config/types"
import { shapeTagOf } from "@/shared/lib/label-config/result"

/** Which region tool is active, plus the brush settings — shared by every
 *  drawing surface of one object (e.g. all pages of a PDF). */
export interface RegionTools {
  controls: ControlTag[]
  activeIndex: number
  active: ControlTag | undefined
  /** Labeled shape family of the active control (rectangle → rectanglelabels). */
  shape: string | undefined
  selectTool: (index: number) => void
  /** Brush diameter, in % of the surface width. */
  brushSize: number
  setBrushSize: (size: number) => void
  erasing: boolean
  setErasing: (erasing: boolean) => void
}

export function useRegionTools(controls: ControlTag[]): RegionTools {
  const [activeIndex, setActiveIndex] = useState(0)
  const [brushSize, setBrushSize] = useState(3)
  const [erasing, setErasing] = useState(false)
  const active = controls[activeIndex]
  const selectTool = useCallback((index: number) => {
    setActiveIndex(index)
    setErasing(false)
  }, [])
  return useMemo(
    () => ({
      controls,
      activeIndex,
      active,
      shape: active ? shapeTagOf(active.tag) : undefined,
      selectTool,
      brushSize,
      setBrushSize,
      erasing,
      setErasing,
    }),
    [controls, activeIndex, active, selectTool, brushSize, erasing]
  )
}

/** Whether a toolbar is worth showing for these tools. */
export const needsRegionToolbar = (tools: RegionTools) =>
  tools.controls.length > 1 || tools.shape === "brushlabels"
