import { useState } from "react"
import { Import, Loader2 } from "lucide-react"
import { Button } from "@/shared/ui/button"
import { Label } from "@/shared/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select"
import type { DatasetImportFormat } from "@/shared/types/ai-runtime"

const FORMATS: {
  value: DatasetImportFormat
  label: string
  hint: string
}[] = [
  {
    value: "auto",
    label: "Auto-detect",
    hint: "Detect the format from the folder contents.",
  },
  {
    value: "yolo",
    label: "YOLO / Roboflow",
    hint: "A data.yaml with images + labels/*.txt files.",
  },
  {
    value: "coco",
    label: "COCO JSON",
    hint: "An _annotations.coco.json (or instances*.json) next to the images.",
  },
]

/**
 * Format-aware "import an existing labeled dataset" card. Pick a format (or let
 * it auto-detect), then choose the unzipped export folder; the backend creates
 * the classes, references the images in place, and converts the annotations.
 */
export function DatasetImportCard({
  isImporting,
  onImport,
}: {
  isImporting: boolean
  onImport: (format: DatasetImportFormat) => void
}) {
  const [format, setFormat] = useState<DatasetImportFormat>("auto")
  const current = FORMATS.find((f) => f.value === format) ?? FORMATS[0]

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed p-4">
      <div>
        <h3 className="font-medium">Import a labeled dataset</h3>
        <p className="text-sm text-muted-foreground">
          Bring images and annotations from an existing export — classes, images,
          and boxes are created for you.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[12rem_1fr] sm:items-end">
        <div className="space-y-1.5">
          <Label>Format</Label>
          <Select
            value={format}
            onValueChange={(v) =>
              v !== null && setFormat(v as DatasetImportFormat)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORMATS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          disabled={isImporting}
          onClick={() => onImport(format)}
        >
          {isImporting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Import className="size-4" />
          )}
          {isImporting ? "Importing…" : "Choose dataset folder"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {current.hint} More formats (Pascal VOC, CreateML, …) are on the way.
      </p>
    </div>
  )
}
