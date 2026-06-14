import { memo } from "react"
import {
  Cpu,
  Zap,
  CheckCircle2,
  Clock,
  AlertTriangle,
  KeyRound,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAiAssistantViewModel } from "@/viewmodels/ai-assistant-viewmodel"
import {
  CAPABILITY_LABELS,
  TASK_LABELS,
  type AiModelStatus,
  type AiRegistryModel,
} from "@/types/ai-assistant"

const StatusBadge = ({ status }: { status: AiModelStatus }) => {
  const available = status === "available"
  return (
    <Badge
      variant="outline"
      className={cn(
        available
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-amber-600 dark:text-amber-400"
      )}
    >
      {available ? <CheckCircle2 /> : <Clock />}
      {available ? "Available" : "Planned"}
    </Badge>
  )
}

const ModelCard = memo(({ model }: { model: AiRegistryModel }) => (
  <Card size="sm">
    <CardHeader>
      <CardTitle>{model.name}</CardTitle>
      <CardDescription>
        {TASK_LABELS[model.task]} &middot; {model.params}
      </CardDescription>
      <CardAction>
        <StatusBadge status={model.status} />
      </CardAction>
    </CardHeader>
    <CardContent className="flex flex-col gap-3">
      <p className="text-muted-foreground">{model.description}</p>

      {model.capabilities.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {model.capabilities.map((capability) => (
            <Badge key={capability} variant="secondary">
              {CAPABILITY_LABELS[capability]}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>ONNX: {model.onnxComponents.join(", ")}</span>
        {model.needsTokenizer && (
          <span className="inline-flex items-center gap-1">
            <KeyRound className="size-3" /> needs tokenizer
          </span>
        )}
        <span>Source: {model.source}</span>
      </div>
    </CardContent>
  </Card>
))

ModelCard.displayName = "ModelCard"

const RuntimeStat = ({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
)

export const AiAssistantPanel = memo(() => {
  const { gpu, models, capabilities, isLoading, error, reload } =
    useAiAssistantViewModel()

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-muted-foreground">
        <Spinner /> Loading AI assistant…
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="size-4" />
          <span className="flex-1">
            Failed to load AI assistant: {String(error)}
          </span>
          <Button variant="outline" size="sm" onClick={() => void reload()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Runtime / GPU detection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {gpu?.gpuAccelerationAvailable ? (
              <Zap className="size-5 text-yellow-500" />
            ) : (
              <Cpu className="size-5 text-muted-foreground" />
            )}
            Inference Runtime
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <RuntimeStat
              label="ONNX Runtime"
              value={gpu?.onnxRuntime ? "Enabled" : "Disabled"}
            />
            <RuntimeStat
              label="Recommended"
              value={gpu?.recommendedProvider ?? "—"}
            />
            <RuntimeStat
              label="Platform"
              value={gpu ? `${gpu.os}/${gpu.arch}` : "—"}
            />
            <RuntimeStat label="CPU cores" value={gpu?.logicalCores ?? "—"} />
          </div>

          <div className="flex flex-wrap gap-2">
            {gpu?.executionProviders.map((provider) => (
              <Badge
                key={provider.name}
                variant={provider.kind === "gpu" ? "default" : "secondary"}
                title={provider.note}
              >
                {provider.kind === "gpu" ? <Zap /> : <Cpu />}
                {provider.name}
              </Badge>
            ))}
          </div>

          {gpu?.gpuAccelerationAvailable === false && (
            <CardDescription>
              GPU acceleration not compiled in — inference will run on CPU.
            </CardDescription>
          )}
        </CardContent>
      </Card>

      {/* Capability matrix */}
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-muted-foreground">Features</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((entry) => (
            <Card key={entry.capability} size="sm">
              <CardContent className="flex items-center gap-2">
                {entry.available ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                ) : (
                  <Clock className="size-4 shrink-0 text-amber-500" />
                )}
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    {CAPABILITY_LABELS[entry.capability]}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {entry.available
                      ? "Ready"
                      : entry.models.length > 0
                        ? `Planned (${entry.models.map((m) => m.name).join(", ")})`
                        : "Planned"}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Model registry */}
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Model Registry
        </h3>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {models.map((model) => (
            <ModelCard key={model.id} model={model} />
          ))}
        </div>
      </section>
    </div>
  )
})

AiAssistantPanel.displayName = "AiAssistantPanel"
