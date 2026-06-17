import { useCallback, useEffect, useState } from "react"
import type { ReactNode } from "react"
import { listen } from "@tauri-apps/api/event"
import { Cpu, Download, Loader2, RotateCw, Zap } from "lucide-react"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card"
import { Progress } from "@/shared/ui/progress"
import { aiRuntimeService } from "@/shared/services/ai-runtime-service"
import { useGpuInstall } from "@/features/ai-models/components/gpu-install-context"
import { useRuntimeInstall } from "@/features/ai-models/components/runtime-install-context"
import type {
  GpuProbe,
  RuntimeState,
  RuntimeStatus,
  RuntimeStatusEvent,
  RuntimeSystemInfo,
} from "@/shared/types/ai-runtime"

const STATE_LABEL: Record<RuntimeState, string> = {
  stopped: "Stopped",
  starting: "Starting…",
  healthy: "Ready",
  unhealthy: "Unhealthy",
  restarting: "Restarting…",
  crashed: "Crashed",
}

type BadgeVariant = "default" | "secondary" | "destructive" | "outline"

const STATE_VARIANT: Record<RuntimeState, BadgeVariant> = {
  stopped: "outline",
  starting: "secondary",
  healthy: "default",
  unhealthy: "destructive",
  restarting: "secondary",
  crashed: "destructive",
}

const isBusy = (state: RuntimeState) =>
  state === "starting" || state === "restarting"

const RuntimeStat = ({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
)

/**
 * Status + control for the embedded Python AI runtime — the FastAPI subprocess
 * that runs all detection / segmentation / copilot vision now that Rust does no
 * inference. Reflects live state via the `runtime://status` event and lets the
 * user restart it or see why it isn't healthy.
 */
export function AiRuntimePanel() {
  const [status, setStatus] = useState<RuntimeStatus | null>(null)
  const [system, setSystem] = useState<RuntimeSystemInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [restarting, setRestarting] = useState(false)
  const [gpuProbe, setGpuProbe] = useState<GpuProbe | null>(null)
  const gpuInstall = useGpuInstall()
  const install = useRuntimeInstall()

  const refresh = useCallback(async () => {
    const [statusResult, systemResult] = await Promise.allSettled([
      aiRuntimeService.status(),
      aiRuntimeService.systemInfo(),
    ])
    if (statusResult.status === "fulfilled") setStatus(statusResult.value)
    if (systemResult.status === "fulfilled") setSystem(systemResult.value)
  }, [])

  useEffect(() => {
    let active = true
    let unlisten: (() => void) | undefined

    void refresh().finally(() => {
      if (active) setIsLoading(false)
    })

    void listen<RuntimeStatusEvent>("runtime://status", (event) => {
      if (!active) return
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              state: event.payload.state,
              lastError: event.payload.lastError ?? null,
            }
          : prev
      )
      // Python/GPU details only become readable once it's serving — pull them
      // when it reaches a healthy state.
      if (event.payload.state === "healthy") void refresh()
    })
      .then((fn) => {
        if (active) unlisten = fn
        else fn()
      })
      .catch(() => {
        // Not running under Tauri (e.g. web build) — the event stream is absent;
        // the one-shot refresh above is enough.
      })

    return () => {
      active = false
      unlisten?.()
    }
  }, [refresh])

  // Independent of torch: detect an NVIDIA GPU via nvidia-smi so we can offer
  // one-click GPU acceleration even while the runtime is on CPU-only torch.
  useEffect(() => {
    let active = true
    void aiRuntimeService
      .gpuProbe()
      .then((probe) => {
        if (active) setGpuProbe(probe)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const handleRestart = async () => {
    setRestarting(true)
    try {
      setStatus(await aiRuntimeService.restart())
      await refresh()
    } catch {
      // The status event / next refresh will surface the failure state.
    } finally {
      setRestarting(false)
    }
  }

  const state = status?.state ?? "stopped"
  const sys = system?.system
  const gpu = system?.gpu
  const gpuActive = Boolean(gpu?.available)
  const busy = restarting || isBusy(state)
  // The interpreter is provisioned on first run, not bundled — until it's
  // installed, the panel shows an install prompt instead of runtime stats.
  const notInstalled = install.installed === false
  const installSizeGb = "~1.5 GB"

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <CardTitle className="flex items-center gap-2">
              {gpuActive ? (
                <Zap className="h-5 w-5 text-warning" />
              ) : (
                <Cpu className="h-5 w-5 text-muted-foreground" />
              )}
              AI Runtime
              {!isLoading &&
                (notInstalled ? (
                  <Badge variant="outline">Not installed</Badge>
                ) : (
                  <Badge variant={STATE_VARIANT[state]}>
                    {STATE_LABEL[state]}
                  </Badge>
                ))}
            </CardTitle>
            <CardDescription>
              Embedded Python runtime — runs all detection, segmentation, and
              copilot vision locally and offline.
            </CardDescription>
          </div>
          {!notInstalled && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleRestart()}
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCw className="h-4 w-4" />
              )}
              Restart
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Checking runtime…</p>
        ) : notInstalled ? (
          <div className="flex flex-col gap-3 rounded-md border border-border/60 bg-muted/40 p-3">
            <p className="text-sm">
              The AI runtime isn't installed yet. Install it to enable
              detection, segmentation, OCR, and the copilot — a one-time{" "}
              {installSizeGb} download that runs in the background. No setup
              needed; everything runs locally and offline afterward.
            </p>
            <div>
              <Button
                size="sm"
                onClick={() => install.start()}
                disabled={install.active}
              >
                {install.active ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {install.active
                  ? "Installing…"
                  : `Install AI runtime (${installSizeGb})`}
              </Button>
            </div>
            {install.active && (
              <div className="flex flex-col gap-1.5">
                <Progress value={install.percent ?? 0} />
                <p className="truncate text-xs text-muted-foreground">
                  {install.percent != null ? `${install.percent}% · ` : ""}
                  {install.message || "Working…"}
                </p>
              </div>
            )}
            {install.error && (
              <p className="text-xs text-destructive">{install.error}</p>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <RuntimeStat
                label="Acceleration"
                value={gpuActive ? gpu?.name || "GPU (CUDA)" : "CPU only"}
              />
              <RuntimeStat label="PyTorch" value={sys?.torch_version || "—"} />
              <RuntimeStat label="Python" value={sys?.python_version || "—"} />
              <RuntimeStat label="CPU cores" value={sys?.cpu_count ?? "—"} />
            </div>

            {gpuActive && (gpu?.cuda_version || gpu?.vram_total_mb) && (
              <p className="text-xs text-muted-foreground">
                {gpu?.cuda_version ? `CUDA ${gpu.cuda_version}` : ""}
                {gpu?.cuda_version && gpu?.vram_total_mb ? " · " : ""}
                {gpu?.vram_total_mb
                  ? `${Math.round(gpu.vram_total_mb / 1024)} GB VRAM`
                  : ""}
              </p>
            )}

            {!gpuActive && state === "healthy" && (
              <div className="flex flex-col gap-2 rounded-md border border-border/60 bg-muted/40 p-3">
                {gpuProbe?.detected ? (
                  gpuInstall.done || gpuProbe.overlayInstalled ? (
                    <>
                      <p className="text-sm">
                        CUDA PyTorch is installed for{" "}
                        <span className="font-medium">{gpuProbe.name}</span>, but the
                        runtime is still on CPU. Restart the app to activate GPU
                        acceleration.
                      </p>
                      <div>
                        <Button size="sm" onClick={() => gpuInstall.restartApp()}>
                          <RotateCw className="h-4 w-4" />
                          Restart app
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm">
                        <span className="font-medium">{gpuProbe.name}</span> detected.
                        Enable GPU acceleration — installs the matching CUDA PyTorch
                        {gpuProbe.recommendedTag ? ` (${gpuProbe.recommendedTag})` : ""},
                        a ~2 GB download you can leave running in the background.
                      </p>
                      <div>
                        <Button
                          size="sm"
                          onClick={() =>
                            gpuInstall.start({
                              tag: gpuProbe.recommendedTag,
                              gpuName: gpuProbe.name,
                            })
                          }
                          disabled={gpuInstall.active}
                        >
                          {gpuInstall.active ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Zap className="h-4 w-4" />
                          )}
                          {gpuInstall.active
                            ? "Installing…"
                            : "Enable GPU acceleration"}
                        </Button>
                      </div>
                      {gpuInstall.error && (
                        <p className="text-xs text-destructive">{gpuInstall.error}</p>
                      )}
                    </>
                  )
                ) : gpuProbe?.platform === "macos" ? (
                  <p className="text-xs text-muted-foreground">
                    Running on CPU. On Apple Silicon, PyTorch uses the GPU
                    (Metal/MPS) automatically when available — if it isn't, the
                    runtime's PyTorch build is CPU-only.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Running on CPU — the bundled runtime ships CPU-only PyTorch
                    ({sys?.torch_version || "torch"}). Connect an NVIDIA GPU with its
                    driver to enable acceleration.
                  </p>
                )}
              </div>
            )}

            {state === "starting" && (
              <p className="text-sm text-muted-foreground">
                Starting the runtime — the first launch loads PyTorch, which can
                take a few seconds.
              </p>
            )}

            {status?.lastError && (
              <CardDescription className="text-destructive">
                {status.lastError}
              </CardDescription>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
