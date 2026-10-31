import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { allowImageDirectory } from "@/shared/lib/desktop"
import { resultsForControl, type StoredResult } from "@/shared/lib/label-config/result"
import { isSpatialControl } from "@/shared/lib/label-config/config-helpers"
import { StandaloneControls } from "@/shared/components/label-config/standalone-controls"
import { defaultWindow, WINDOW_PRESETS } from "@/shared/lib/dicom/dicom"
import { seriesOfItem } from "@/shared/lib/dicom/scan"
import type { EditorProps } from "./types"
import { Notice } from "./custom/config-notice"
import { useConfigResults } from "./custom/use-config-results"
import { useParsedConfig } from "./custom/use-parsed-config"
import { RegionSurface } from "./custom/region-surface"
import { RegionToolbar } from "./custom/region-toolbar"
import { needsRegionToolbar, useRegionTools } from "./custom/region-tools"
import { SliceCanvas } from "./dicom/slice-canvas"
import { useDicomSlice } from "./dicom/use-dicom-slice"

interface WindowLevel {
  center: number
  width: number
}

// DICOM series editor: scroll slices (wheel / slider / arrow keys), adjust
// window / level (presets or right-drag), and draw the config's region
// controls on the current slice. Every region's value carries `slice` (index in
// the series) and `sopInstanceUid`, so exports can map it back to its image.
export const DicomEditor = memo(({ viewModel }: EditorProps) => {
  const doc = viewModel.data.item
  const { annotations } = viewModel.data
  const parsed = useParsedConfig(viewModel.project?.settings?.labelConfig as string | undefined)
  const results = useConfigResults(annotations, viewModel)
  const series = useMemo(() => seriesOfItem(doc?.data), [doc?.data])
  const slices = useMemo(() => series?.slices ?? [], [series])

  const dicomObject = parsed.config?.objects.find((object) => object.tag === "dicom")
  const regionControls = useMemo(
    () =>
      parsed.config?.controls.filter(
        (control) => isSpatialControl(control) && control.toName === dicomObject?.name
      ) ?? [],
    [parsed.config, dicomObject?.name]
  )
  const standalone = useMemo(
    () =>
      parsed.config?.controls.filter(
        (control) => !isSpatialControl(control) && control.tag !== "relations"
      ) ?? [],
    [parsed.config]
  )
  const tools = useRegionTools(regionControls)

  const [index, setIndex] = useState(0)
  const sliceIndex = Math.min(index, Math.max(0, slices.length - 1))
  const { pixels, error } = useDicomSlice(slices, sliceIndex)
  const [windowLevel, setWindowLevel] = useState<WindowLevel | null>(null)
  const shown = windowLevel ?? (pixels ? defaultWindow(pixels) : null)
  const level = useRef<{ x: number; y: number; start: WindowLevel } | null>(null)

  useEffect(() => {
    if (doc?.path) void allowImageDirectory(doc.path).catch(() => {})
  }, [doc?.path])

  const step = useCallback(
    (delta: number) =>
      setIndex((current) => Math.max(0, Math.min(slices.length - 1, current + delta))),
    [slices.length]
  )

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement | null)?.closest("input, textarea, select")) return
      if (event.key === "ArrowUp" || event.key === "PageUp") step(-1)
      else if (event.key === "ArrowDown" || event.key === "PageDown") step(1)
      else return
      event.preventDefault()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [step])

  // Regions per slice, and which slices have any.
  const { bySlice, marked } = useMemo(() => {
    const map = new Map<number, Record<string, StoredResult[]>>()
    for (const control of regionControls) {
      for (const result of resultsForControl(annotations, control.name)) {
        const at = Number(result.value.slice) || 0
        const entry = map.get(at) ?? {}
        ;(entry[control.name] ??= []).push(result)
        map.set(at, entry)
      }
    }
    return { bySlice: map, marked: [...map.keys()] }
  }, [regionControls, annotations])

  const extra = useMemo(
    () => ({ slice: sliceIndex, sopInstanceUid: slices[sliceIndex]?.sopUid ?? "" }),
    [sliceIndex, slices]
  )
  const size = useMemo(
    () => (pixels ? { width: pixels.width, height: pixels.height } : null),
    [pixels]
  )

  if (!doc) {
    return (
      <div className="flex flex-1 items-center justify-center bg-muted">
        <p className="text-muted-foreground">No items in this project</p>
      </div>
    )
  }
  if (parsed.error) {
    return (
      <Notice icon="error" title="Labeling config error">
        {parsed.error}
      </Notice>
    )
  }
  if (!series || slices.length === 0) {
    return (
      <Notice icon="info" title="Not a DICOM series">
        This item has no slice list. Import DICOM folders from the project&apos;s Data tab.
      </Notice>
    )
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-background">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-4 py-2 text-xs">
        <span className="min-w-0 max-w-64 truncate text-sm font-medium" title={doc.name}>
          {series.description}
        </span>
        <span className="text-muted-foreground">{series.modality}</span>
        <select
          value=""
          onChange={(event) => {
            const preset = WINDOW_PRESETS.find((entry) => entry.name === event.target.value)
            if (preset) setWindowLevel({ center: preset.center, width: preset.width })
            else if (event.target.value === "auto") setWindowLevel(null)
          }}
          className="ml-auto rounded-md border border-border bg-background px-2 py-1"
          aria-label="Window preset"
        >
          <option value="" disabled>
            Window preset
          </option>
          <option value="auto">Default</option>
          {WINDOW_PRESETS.map((preset) => (
            <option key={preset.name} value={preset.name}>
              {preset.name}
            </option>
          ))}
        </select>
        {shown && (
          <span className="tabular-nums text-muted-foreground">
            W {Math.round(shown.width)} · L {Math.round(shown.center)}
          </span>
        )}
      </div>

      {needsRegionToolbar(tools) && <RegionToolbar tools={tools} />}

      <div
        className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black p-4"
        onWheel={(event) => step(event.deltaY > 0 ? 1 : -1)}
        onContextMenu={(event) => event.preventDefault()}
        onPointerDownCapture={(event) => {
          if (event.button !== 2 || !shown) return
          event.stopPropagation()
          event.currentTarget.setPointerCapture(event.pointerId)
          level.current = { x: event.clientX, y: event.clientY, start: shown }
        }}
        onPointerMove={(event) => {
          const drag = level.current
          if (!drag) return
          setWindowLevel({
            width: Math.max(1, drag.start.width + (event.clientX - drag.x) * 4),
            center: drag.start.center + (event.clientY - drag.y) * 2,
          })
        }}
        onPointerUp={() => {
          level.current = null
        }}
      >
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : !pixels || !shown ? (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading slice…
          </span>
        ) : (
          <div style={{ width: `min(100%, calc((100vh - 18rem) * ${pixels.width / pixels.height}))` }}>
            <RegionSurface
              tools={tools}
              resultsByControl={bySlice.get(sliceIndex) ?? EMPTY}
              size={size}
              extra={extra}
              onCreateRegion={results.addRegion}
              onDeleteRegion={viewModel.deleteAnnotation}
            >
              <SliceCanvas pixels={pixels} center={shown.center} width={shown.width} />
            </RegionSurface>
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-1 border-t border-border bg-card px-4 py-2 text-xs">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => step(-1)} className="rounded p-1 hover:bg-muted" aria-label="Previous slice">
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" onClick={() => step(1)} className="rounded p-1 hover:bg-muted" aria-label="Next slice">
            <ChevronRight className="size-4" />
          </button>
          <input
            type="range"
            min={0}
            max={slices.length - 1}
            value={sliceIndex}
            onChange={(event) => setIndex(Number(event.target.value))}
            className="min-w-0 flex-1"
            aria-label="Slice"
          />
          <span className="w-20 text-right tabular-nums text-muted-foreground">
            {sliceIndex + 1} / {slices.length}
          </span>
        </div>
        {/* Slices with regions, for jumping between findings. */}
        <div className="relative mx-16 h-2" aria-hidden>
          {marked.map((at) => (
            <button
              key={at}
              type="button"
              tabIndex={-1}
              onClick={() => setIndex(at)}
              className="absolute top-0 h-2 w-1 -translate-x-1/2 rounded-sm bg-primary"
              style={{ left: `${slices.length > 1 ? (at / (slices.length - 1)) * 100 : 0}%` }}
            />
          ))}
        </div>
        <p className="text-muted-foreground">
          Scroll or ↑ / ↓ to change slice · right-drag to adjust window / level
        </p>
      </div>

      <StandaloneControls
        controls={standalone}
        api={{
          valueFor: results.valueFor,
          onSet: results.setControlValue,
          onClear: results.clearControlValue,
        }}
      />
    </div>
  )
})

DicomEditor.displayName = "DicomEditor"

const EMPTY: Record<string, StoredResult[]> = {}
