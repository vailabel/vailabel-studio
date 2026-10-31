import { memo, useCallback, useEffect, useMemo, useState } from "react"
import { Box, Loader2, MousePointer2 } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { cuboidValue, resultsForControl } from "@/shared/lib/label-config/result"
import { choicesToLabels, colorForChoice, isSpatialControl } from "@/shared/lib/label-config/config-helpers"
import type { ControlTag } from "@/shared/lib/label-config/types"
import { StandaloneControls } from "@/shared/components/label-config/standalone-controls"
import {
  fitHeight,
  pointsInside,
  type Cuboid,
} from "@/features/studio/model/lib/pointcloud/cuboid"
import type { EditorProps } from "./types"
import { Notice } from "./custom/config-notice"
import { useConfigResults } from "./custom/use-config-results"
import { useParsedConfig } from "./custom/use-parsed-config"
import { PointCloudViewport, type ViewCuboid } from "./pointcloud/point-cloud-viewport"
import { TopView } from "./pointcloud/top-view"
import { CuboidInspector } from "./pointcloud/cuboid-inspector"
import { usePointCloud } from "./pointcloud/use-point-cloud"

interface EditorCuboid extends ViewCuboid {
  control: ControlTag
  label: string
}

const ROTATE_STEP = Math.PI / 36

// Point cloud editor (3D object detection): a perspective view to inspect the
// scene and a bird's-eye view to place cuboids — drag a footprint and the
// height fits the points standing on it. Cuboids are config results
// ({x, y, z, length, width, height, yaw, cuboidlabels}); the config's other
// controls (scene tags, notes) render below.
export const PointCloudEditor = memo(({ viewModel }: EditorProps) => {
  const doc = viewModel.data.item
  const { annotations } = viewModel.data
  const parsed = useParsedConfig(viewModel.project?.settings?.labelConfig as string | undefined)
  const results = useConfigResults(annotations, viewModel)
  const { cloud, error, loading } = usePointCloud(doc?.path)

  const cuboidControls = useMemo(
    () => parsed.config?.controls.filter((control) => control.tag === "cuboidlabels") ?? [],
    [parsed.config]
  )
  const standalone = useMemo(
    () =>
      parsed.config?.controls.filter(
        (control) => !isSpatialControl(control) && control.tag !== "relations"
      ) ?? [],
    [parsed.config]
  )
  const [controlIndex, setControlIndex] = useState(0)
  const [labelIndex, setLabelIndex] = useState(0)
  const [drawing, setDrawing] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const control = cuboidControls[controlIndex] ?? cuboidControls[0]
  const labels = useMemo(() => (control ? choicesToLabels(control) : []), [control])
  const activeLabel = labels[labelIndex] ?? labels[0]

  const cuboids = useMemo<EditorCuboid[]>(
    () =>
      cuboidControls.flatMap((cuboidControl) =>
        resultsForControl(annotations, cuboidControl.name).map((result) => {
          const value = result.value as unknown as Cuboid & { cuboidlabels?: string[] }
          const label = value.cuboidlabels?.[0] ?? cuboidControl.name
          return {
            id: result.id,
            control: cuboidControl,
            label,
            color: colorForChoice(cuboidControl, label),
            x: value.x,
            y: value.y,
            z: value.z,
            length: value.length,
            width: value.width,
            height: value.height,
            yaw: value.yaw ?? 0,
          }
        })
      ),
    [cuboidControls, annotations]
  )
  const selected = cuboids.find((cuboid) => cuboid.id === selectedId)

  const save = useCallback(
    (cuboid: EditorCuboid, next: Cuboid, label: string) =>
      results.updateRegion(cuboid.id, cuboid.control, cuboidValue(next, [label])),
    [results]
  )

  const create = useCallback(
    (footprint: Omit<Cuboid, "z" | "height">) => {
      if (!control || !activeLabel || !cloud) return
      const box = fitHeight(footprint, cloud.positions)
      results.addRegion(control, cuboidValue(box, [activeLabel.name]), activeLabel.color)
    },
    [control, activeLabel, cloud, results]
  )

  // Q / E rotate the selected cuboid; Delete removes it.
  useEffect(() => {
    if (!selected) return
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest("input, textarea, select")) return
      if (event.key === "q" || event.key === "e") {
        const yaw = selected.yaw + (event.key === "q" ? ROTATE_STEP : -ROTATE_STEP)
        save(selected, { ...selected, yaw }, selected.label)
      } else if (event.key === "Delete" || event.key === "Backspace") {
        void viewModel.deleteAnnotation(selected.id)
        setSelectedId(null)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [selected, save, viewModel])

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

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-background">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-4 py-2 text-xs">
        <span className="mr-2 min-w-0 max-w-64 truncate text-sm font-medium" title={doc.name}>
          {doc.name}
        </span>
        <button
          type="button"
          onClick={() => setDrawing(false)}
          className={cn("inline-flex items-center gap-1 rounded-md px-2 py-1", !drawing ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
        >
          <MousePointer2 className="size-3.5" />
          Select
        </button>
        <button
          type="button"
          onClick={() => setDrawing(true)}
          className={cn("inline-flex items-center gap-1 rounded-md px-2 py-1", drawing ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
        >
          <Box className="size-3.5" />
          Add cuboid
        </button>
        {cuboidControls.length > 1 && (
          <select
            value={controlIndex}
            onChange={(event) => {
              setControlIndex(Number(event.target.value))
              setLabelIndex(0)
            }}
            className="rounded-md border border-border bg-background px-2 py-1"
            aria-label="Cuboid control"
          >
            {cuboidControls.map((entry, index) => (
              <option key={entry.name} value={index}>
                {entry.name}
              </option>
            ))}
          </select>
        )}
        <span className="ml-2 flex flex-wrap gap-1">
          {labels.map((label, index) => (
            <button
              key={label.id}
              type="button"
              onClick={() => setLabelIndex(index)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-0.5",
                index === labelIndex ? "border-primary" : "border-border"
              )}
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: label.color }} />
              {label.name}
            </button>
          ))}
        </span>
        <span className="ml-auto text-muted-foreground">
          {cloud ? `${cloud.count.toLocaleString()} points · ${cuboids.length} cuboids` : ""}
        </span>
      </div>

      {error ? (
        <Notice icon="error" title="Could not open point cloud">
          {error}
        </Notice>
      ) : loading || !cloud ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading point cloud…
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,3fr)_minmax(18rem,2fr)]">
          <div className="min-h-0 border-r border-border">
            <PointCloudViewport cloud={cloud} cuboids={cuboids} selectedId={selectedId} />
          </div>
          <div className="flex min-h-0 flex-col">
            <div className="min-h-0 flex-1">
              <TopView
                cloud={cloud}
                cuboids={cuboids}
                selectedId={selectedId}
                drawing={drawing}
                onSelect={setSelectedId}
                onCreate={create}
              />
            </div>
            <div className="shrink-0 border-t border-border bg-card">
              {selected ? (
                <CuboidInspector
                  cuboid={selected}
                  labels={labels.length ? labels.map((label) => label.name) : [selected.label]}
                  pointCount={pointsInside(selected, cloud.positions)}
                  onChange={(next, label) => save(selected, next, label)}
                  onDelete={() => {
                    void viewModel.deleteAnnotation(selected.id)
                    setSelectedId(null)
                  }}
                />
              ) : (
                <p className="p-3 text-xs text-muted-foreground">
                  {drawing
                    ? "Drag in the top view to place a cuboid. Scroll to zoom, right-drag to pan."
                    : "Click a cuboid in the top view to edit it."}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

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

PointCloudEditor.displayName = "PointCloudEditor"
