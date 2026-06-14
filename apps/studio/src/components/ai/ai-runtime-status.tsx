import { useEffect, useState } from "react"
import { Cpu, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { aiAssistantService } from "@/services/ai-assistant-service"
import type { AiGpuInfo } from "@/types/ai-assistant"

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

/**
 * Compact runtime/GPU status for the AI Assistant page. Reports the local ONNX
 * runtime and execution providers used for AI detect, so users can tell whether
 * inference will run on GPU or CPU before running predictions.
 */
export function AiRuntimeStatus() {
  const [gpu, setGpu] = useState<AiGpuInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {gpu?.gpuAccelerationAvailable ? (
            <Zap className="h-5 w-5 text-yellow-500" />
          ) : (
            <Cpu className="h-5 w-5 text-muted-foreground" />
          )}
          Inference Runtime
        </CardTitle>
        <CardDescription>
          Local ONNX runtime and execution providers used for AI detect.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Detecting runtime…</p>
        ) : (
          <>
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
                  {provider.kind === "gpu" ? (
                    <Zap className="h-3 w-3" />
                  ) : (
                    <Cpu className="h-3 w-3" />
                  )}
                  {provider.name}
                </Badge>
              ))}
            </div>

            {gpu?.gpuAccelerationAvailable === false && (
              <CardDescription>
                GPU acceleration not compiled in — inference runs on CPU.
              </CardDescription>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
