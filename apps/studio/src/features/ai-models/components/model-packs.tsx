import { useEffect, useState } from "react"
import { Check, Cpu, Download, Feather, Gauge, Rocket, Zap } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/shared/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card"
import { Badge } from "@/shared/ui/badge"
import { Spinner } from "@/shared/ui/spinner"
import { cn } from "@/shared/lib/utils"
import { aiAssistantService } from "@/shared/services/ai-assistant-service"
import type { AiGpuInfo } from "@/shared/types/ai-assistant"
import type {
  CatalogSystemModel,
  CatalogSystemModelVariant,
} from "@/features/ai-models/model/ai-model-viewmodel"
import type { AIModel } from "@/shared/types/core"
import {
  MODEL_PACKS,
  packName,
  recommendTier,
  type ModelPack,
  type PackId,
} from "@/features/ai-models/model/lib/model-packs"

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  )
  const value = bytes / Math.pow(1024, exponent)
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

const PACK_ICON: Record<PackId, typeof Feather> = {
  lite: Feather,
  balanced: Gauge,
  max: Rocket,
}

interface ModelPacksProps {
  systemModels: CatalogSystemModel[]
  findInstalledCatalogVariant: (
    model: CatalogSystemModel,
    variant: CatalogSystemModelVariant
  ) => AIModel | null
  installSystemModel: (
    model: CatalogSystemModel,
    variant: CatalogSystemModelVariant
  ) => Promise<AIModel>
  refreshModels: () => Promise<void>
}

type ResolvedItem = {
  label: string
  primary?: boolean
  model: CatalogSystemModel
  variant: CatalogSystemModelVariant
  installed: AIModel | null
}

type ResolvedPack = ModelPack & {
  resolved: ResolvedItem[]
  totalSize: number
  installedCount: number
  allInstalled: boolean
}

export function ModelPacks({
  systemModels,
  findInstalledCatalogVariant,
  installSystemModel,
  refreshModels,
}: ModelPacksProps) {
  const [gpu, setGpu] = useState<AiGpuInfo | null>(null)
  const [installingPackId, setInstallingPackId] = useState<PackId | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null
  )

  useEffect(() => {
    let active = true
    void aiAssistantService
      .getGpuInfo()
      .then((info) => {
        if (active) setGpu(info)
      })
      .catch(() => {
        if (active) setGpu(null)
      })
    return () => {
      active = false
    }
  }, [])

  const recommended = recommendTier(gpu)

  const resolvedPacks: ResolvedPack[] = MODEL_PACKS.map((pack) => {
    const resolved: ResolvedItem[] = []
    for (const item of pack.items) {
      const model = systemModels.find((entry) => entry.id === item.modelId)
      const variant = model?.variants?.find((entry) => entry.slug === item.slug)
      if (!model || !variant) continue
      resolved.push({
        label: item.label,
        primary: item.primary,
        model,
        variant,
        installed: findInstalledCatalogVariant(model, variant),
      })
    }
    const totalSize = resolved.reduce(
      (sum, item) => sum + (item.variant.size ?? 0),
      0
    )
    const installedCount = resolved.filter((item) => item.installed).length
    return {
      ...pack,
      resolved,
      totalSize,
      installedCount,
      allInstalled: resolved.length > 0 && installedCount === resolved.length,
    }
  })

  const handleInstallPack = async (pack: ResolvedPack) => {
    const pending = pack.resolved.filter((item) => !item.installed)
    setInstallingPackId(pack.id)
    setProgress({ done: 0, total: pending.length })
    try {
      for (let index = 0; index < pending.length; index += 1) {
        const item = pending[index]
        await installSystemModel(item.model, item.variant)
        setProgress({ done: index + 1, total: pending.length })
      }

      await refreshModels()
      toast.success(`${pack.name} pack installed`, {
        description: `${pack.resolved.length} models ready for auto-labeling.`,
      })
    } catch (error) {
      toast.error("Pack install failed", {
        description:
          error instanceof Error
            ? error.message
            : "One of the models could not be downloaded.",
      })
    } finally {
      setInstallingPackId(null)
      setProgress(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {gpu ? (
          <>
            {gpu.gpuAccelerationAvailable ? (
              <Zap className="size-4 text-warning" />
            ) : (
              <Cpu className="size-4" />
            )}
            <span>
              Detected{" "}
              <span className="font-medium text-foreground">
                {gpu.gpuAccelerationAvailable ? "GPU acceleration" : "CPU only"}
              </span>{" "}
              · {gpu.logicalCores} cores — recommended pack:{" "}
              <span className="font-medium text-foreground">
                {packName(recommended)}
              </span>
            </span>
          </>
        ) : (
          <>
            <Spinner className="size-3.5" />
            <span>Detecting hardware…</span>
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {resolvedPacks.map((pack) => {
          const Icon = PACK_ICON[pack.id]
          const isRecommended = pack.id === recommended
          const installing = installingPackId === pack.id
          const disabled = installingPackId !== null
          return (
            <Card
              key={pack.id}
              className={cn(
                "flex flex-col",
                isRecommended && "ring-1 ring-primary"
              )}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2 text-base">
                  <span className="flex items-center gap-2">
                    <Icon className="size-4.5 text-muted-foreground" />
                    {pack.name}
                  </span>
                  {isRecommended && <Badge>Recommended</Badge>}
                </CardTitle>
                <CardDescription>{pack.tagline}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <p className="text-sm text-muted-foreground">{pack.blurb}</p>

                <ul className="flex flex-col gap-1.5 text-sm">
                  {pack.resolved.map((item) => (
                    <li
                      key={`${pack.id}:${item.model.id}:${item.variant.slug}`}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="flex items-center gap-2">
                        {item.installed ? (
                          <Check className="size-3.5 shrink-0 text-success" />
                        ) : (
                          <Download className="size-3.5 shrink-0 text-muted-foreground" />
                        )}
                        {item.label}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {formatBytes(item.variant.size ?? 0)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                  <span className="text-xs text-muted-foreground">
                    {pack.resolved.length} models · {formatBytes(pack.totalSize)}
                  </span>
                  {pack.allInstalled ? (
                    <Badge variant="secondary">
                      <Check className="size-3.5" />
                      Installed
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={() => void handleInstallPack(pack)}
                      disabled={disabled}
                    >
                      {installing ? (
                        <>
                          <Spinner className="size-3.5" />
                          {progress
                            ? `Installing ${progress.done}/${progress.total}…`
                            : "Installing…"}
                        </>
                      ) : (
                        <>
                          <Download className="size-4" />
                          {pack.installedCount > 0
                            ? "Complete pack"
                            : "Install pack"}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
