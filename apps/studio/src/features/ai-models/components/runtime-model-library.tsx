import { Boxes, Brain } from "lucide-react"
import { Badge } from "@/shared/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card"
import { Spinner } from "@/shared/ui/spinner"
import { useRuntimeModelsViewModel } from "@/features/ai-models/model/runtime-models-viewmodel"
import type { RuntimeModel, RuntimeModelStatus } from "@/shared/types/ai-runtime"

function formatBytes(bytes: number): string {
  if (!bytes) return "—"
  const units = ["B", "KB", "MB", "GB"]
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  )
  const value = bytes / Math.pow(1024, exponent)
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

const CAPABILITY_LABEL: Record<string, string> = {
  object_detection: "Detection",
  detection: "Detection",
  prompt_detection: "Prompt detect",
  segmentation: "Segmentation",
  caption: "Caption",
  captioning: "Caption",
  ocr: "OCR",
  embedding: "Embedding",
  tracking: "Tracking",
  pose_estimation: "Pose",
}

const capabilityLabel = (capability: string) =>
  CAPABILITY_LABEL[capability] ?? capability.replace(/_/g, " ")

const STATUS_META: Record<
  RuntimeModelStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  installed: { label: "Loaded", variant: "default" },
  downloading: { label: "Downloading…", variant: "secondary" },
  available: { label: "Ready", variant: "outline" },
  error: { label: "Error", variant: "destructive" },
}

function ModelCard({ model }: { model: RuntimeModel }) {
  const status = STATUS_META[model.status] ?? STATUS_META.available
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Boxes className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium">{model.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {model.family} · {model.version}
              </p>
            </div>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>

        {model.capabilities && model.capabilities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {model.capabilities.map((capability) => (
              <Badge key={capability} variant="secondary">
                {capabilityLabel(capability)}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="tabular-nums">{formatBytes(model.size)}</span>
          <span>
            {model.status === "installed"
              ? "Downloaded"
              : "Fetched on first use"}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * The embedded Python runtime's model catalog. Weights download automatically
 * the first time a model runs (ultralytics / transformers / paddleocr handle
 * their own fetch + cache), so this is a read-only view of what's available and
 * what's already resident.
 */
export function RuntimeModelLibrary() {
  const { models, isLoading, error } = useRuntimeModelsViewModel()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="size-4.5 text-muted-foreground" />
          Model library
        </CardTitle>
        <CardDescription>
          Models the runtime can run for auto-labeling and the copilot. They
          download automatically on first use — no manual install.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Spinner /> Loading model catalog…
          </div>
        ) : error ? (
          <p className="py-6 text-center text-sm text-destructive">{error}</p>
        ) : models.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            The runtime catalog is empty.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {models.map((model) => (
              <ModelCard key={model.id} model={model} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
