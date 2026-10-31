import { memo } from "react"
import { Trash2 } from "lucide-react"
import type { Cuboid } from "@/features/studio/model/lib/pointcloud/cuboid"
import { Button } from "@/shared/ui/button"

const FIELDS: Array<{ key: keyof Cuboid; label: string; step: number }> = [
  { key: "x", label: "X", step: 0.1 },
  { key: "y", label: "Y", step: 0.1 },
  { key: "z", label: "Z", step: 0.1 },
  { key: "length", label: "Length", step: 0.1 },
  { key: "width", label: "Width", step: 0.1 },
  { key: "height", label: "Height", step: 0.1 },
]

interface CuboidInspectorProps {
  cuboid: Cuboid & { label: string }
  labels: string[]
  pointCount: number
  onChange: (cuboid: Cuboid, label: string) => void
  onDelete: () => void
}

/** Numeric editor for the selected cuboid (metres; yaw in degrees). */
export const CuboidInspector = memo(
  ({ cuboid, labels, pointCount, onChange, onDelete }: CuboidInspectorProps) => {
    const set = (patch: Partial<Cuboid>) => onChange({ ...cuboid, ...patch }, cuboid.label)
    return (
      <div className="flex flex-col gap-2 p-3 text-xs">
        <div className="flex items-center gap-2">
          <select
            value={cuboid.label}
            onChange={(event) => onChange(cuboid, event.target.value)}
            className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1"
            aria-label="Cuboid label"
          >
            {labels.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
          <Button size="sm" variant="outline" onClick={onDelete} aria-label="Delete cuboid">
            <Trash2 className="size-3.5" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {FIELDS.map(({ key, label, step }) => (
            <label key={key} className="flex flex-col gap-0.5 text-muted-foreground">
              {label}
              <input
                type="number"
                step={step}
                value={Number(cuboid[key].toFixed(2))}
                onChange={(event) => {
                  const value = Number(event.target.value)
                  if (Number.isFinite(value)) set({ [key]: value })
                }}
                className="rounded-md border border-border bg-background px-1.5 py-1 text-foreground tabular-nums"
              />
            </label>
          ))}
          <label className="col-span-3 flex flex-col gap-0.5 text-muted-foreground">
            Yaw (°) — Q / E rotate
            <input
              type="number"
              step={5}
              value={Math.round((cuboid.yaw * 180) / Math.PI)}
              onChange={(event) => {
                const degrees = Number(event.target.value)
                if (Number.isFinite(degrees)) set({ yaw: (degrees * Math.PI) / 180 })
              }}
              className="rounded-md border border-border bg-background px-1.5 py-1 text-foreground tabular-nums"
            />
          </label>
        </div>
        <p className="text-muted-foreground">{pointCount.toLocaleString()} points inside</p>
      </div>
    )
  }
)

CuboidInspector.displayName = "CuboidInspector"
