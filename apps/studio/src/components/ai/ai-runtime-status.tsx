import { useEffect, useState } from "react"
import { listen } from "@tauri-apps/api/event"
import { Cpu, Download, Loader2, RotateCw, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { aiAssistantService } from "@/services/ai-assistant-service"
import type {
  AiGpuInfo,
  RuntimeInstallProgress,
  RuntimeInstallResult,
  RuntimeInstallStatus,
} from "@/types/ai-assistant"

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

const PROGRESS_EVENT = "ai-runtime-install://progress"

/** Pull a "1.22.0" version out of the loaded runtime's build string
 *  ("ORT Build Info: git-branch=rel-1.22.0, …"); falls back to the raw string. */
const runtimeVersionLabel = (buildInfo?: string | null) => {
  if (!buildInfo) return null
  const match = buildInfo.match(/rel-(\d+\.\d+\.\d+)/i)
  return match ? match[1] : buildInfo
}

const formatBytes = (bytes: number) => {
  if (!bytes) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  )
  const value = bytes / Math.pow(1024, exponent)
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

/**
 * Compact runtime/GPU status for the AI Assistant page. Reports the local ONNX
 * runtime and execution providers used for AI detect, so users can tell whether
 * inference will run on GPU or CPU before running predictions. When the runtime
 * isn't present, it can download and install only the missing pieces (Microsoft's
 * GPU build and/or cuDNN) on demand, instead of the manual setup in
 * docs/ONNXRUNTIME_GPU_SETUP.md.
 */
export function AiRuntimeStatus() {
  const [gpu, setGpu] = useState<AiGpuInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [runtimeStatus, setRuntimeStatus] =
    useState<RuntimeInstallStatus | null>(null)
  const [installing, setInstalling] = useState(false)
  const [progress, setProgress] = useState<RuntimeInstallProgress | null>(null)
  const [result, setResult] = useState<RuntimeInstallResult | null>(null)
  const [installError, setInstallError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void aiAssistantService
      .getGpuInfo()
      .then(async (info) => {
        if (!active) return
        setGpu(info)
        // Only the missing-runtime case needs the on-disk status (to decide
        // whether to offer a download or just a restart).
        if (!info.onnxRuntimeLoaded) {
          try {
            const status = await aiAssistantService.getRuntimeStatus()
            if (active) setRuntimeStatus(status)
          } catch {
            if (active) setRuntimeStatus(null)
          }
        }
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

  const handleInstall = async () => {
    setInstalling(true)
    setInstallError(null)
    setResult(null)
    setProgress(null)
    const unlisten = await listen<RuntimeInstallProgress>(
      PROGRESS_EVENT,
      (event) => setProgress(event.payload)
    )
    try {
      const installed = await aiAssistantService.installRuntime(true)
      setResult(installed)
      // Refresh the on-disk view so the UI reflects what's now present.
      try {
        setRuntimeStatus(await aiAssistantService.getRuntimeStatus())
      } catch {
        // Non-fatal — the result object already drives the success UI.
      }
    } catch (error) {
      setInstallError(error instanceof Error ? error.message : String(error))
    } finally {
      unlisten()
      setInstalling(false)
      setProgress(null)
    }
  }

  const handleRestart = () => {
    void aiAssistantService.restartForRuntime()
  }

  const isWindows = gpu?.os === "windows"
  const percent =
    progress?.totalBytes && progress.totalBytes > 0
      ? Math.min(100, (progress.receivedBytes / progress.totalBytes) * 100)
      : null

  // Already downloaded but not yet loaded (the runtime only activates on
  // restart). cuDNN may still be missing for CUDA.
  const onDisk = runtimeStatus?.installed === true
  const cudnnMissing = onDisk && runtimeStatus?.cudnnInstalled === false

  const progressView = installing && progress && (
    <div className="flex flex-col gap-1">
      <Progress value={percent} />
      <span className="text-xs text-muted-foreground">
        {progress.message}
        {progress.totalBytes
          ? ` — ${formatBytes(progress.receivedBytes)} / ${formatBytes(progress.totalBytes)}`
          : progress.receivedBytes
            ? ` — ${formatBytes(progress.receivedBytes)}`
            : ""}
      </span>
    </div>
  )

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
                value={
                  gpu?.onnxRuntimeLoaded ? (
                    <span title={gpu?.loadedRuntimeBuildInfo ?? undefined}>
                      {runtimeVersionLabel(gpu?.loadedRuntimeBuildInfo)
                        ? `Loaded ${runtimeVersionLabel(gpu?.loadedRuntimeBuildInfo)}`
                        : "Loaded"}
                    </span>
                  ) : gpu?.onnxRuntime ? (
                    "Not loaded"
                  ) : (
                    "Disabled"
                  )
                }
              />
              <RuntimeStat
                label="GPU (CUDA)"
                value={gpu?.cudaAvailable ? "Active" : "CPU only"}
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

            {gpu?.onnxRuntimeLoaded === false && (
              <CardDescription className="text-destructive">
                {gpu?.loadError ||
                  "ONNX Runtime failed to load — AI detect won't run until a compatible onnxruntime library is available."}
              </CardDescription>
            )}

            {gpu?.onnxRuntimeLoaded === true &&
              gpu?.cudaAvailable === false &&
              gpu?.cudaCompiled === true && (
                <CardDescription>
                  Running on CPU — the CUDA provider isn't usable on this host
                  (missing CUDA/cuDNN libraries or a non-GPU ONNX Runtime build).
                  See docs/ONNXRUNTIME_GPU_SETUP.md.
                </CardDescription>
              )}

            {/* Auto-installer: only offered when the runtime isn't loaded
                (Windows). It downloads just the pieces that aren't on disk. */}
            {gpu?.onnxRuntimeLoaded === false && !result && (
              <div className="flex flex-col gap-2 rounded-md border border-border/60 bg-muted/40 p-3">
                {!isWindows ? (
                  <p className="text-sm text-muted-foreground">
                    Automatic install is Windows-only for now. See
                    docs/ONNXRUNTIME_GPU_SETUP.md for manual setup on this
                    platform.
                  </p>
                ) : onDisk ? (
                  // Already downloaded — just restart. Offer cuDNN if it's the
                  // only thing still missing for CUDA.
                  <>
                    <p className="text-sm">
                      ONNX Runtime {runtimeStatus?.version} is already downloaded
                      {runtimeStatus?.cudnnInstalled
                        ? " with cuDNN (CUDA ready)"
                        : ""}
                      . Restart the app to activate it.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={handleRestart}>
                        <RotateCw className="h-4 w-4" />
                        Restart now
                      </Button>
                      {cudnnMissing && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={handleInstall}
                          disabled={installing}
                        >
                          {installing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          {installing
                            ? "Downloading…"
                            : "Add cuDNN (CUDA acceleration)"}
                        </Button>
                      )}
                    </div>
                    {progressView}
                  </>
                ) : (
                  // Nothing on disk yet — full install.
                  <>
                    <p className="text-sm">
                      Install ONNX Runtime automatically — downloads Microsoft's
                      GPU build and cuDNN (~1 GB) into the app's data folder. No
                      manual setup needed; falls back to CPU if CUDA isn't usable.
                    </p>
                    <div>
                      <Button
                        size="sm"
                        onClick={handleInstall}
                        disabled={installing}
                      >
                        {installing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        {installing
                          ? "Installing…"
                          : "Download & install (GPU)"}
                      </Button>
                    </div>
                    {progressView}
                  </>
                )}
                {installError && (
                  <CardDescription className="text-destructive">
                    Install failed: {installError}
                  </CardDescription>
                )}
              </div>
            )}

            {/* Done: summarize what landed and prompt a restart to load it. */}
            {result && (
              <div className="flex flex-col gap-2 rounded-md border border-border/60 bg-muted/40 p-3">
                <p className="text-sm">
                  {result.alreadyPresent
                    ? `ONNX Runtime ${result.version} is already installed${result.cudnnInstalled ? " with cuDNN" : ""}.`
                    : `ONNX Runtime ${result.version} installed${result.cudnnInstalled ? " with cuDNN (CUDA acceleration ready)" : " (CPU)"}.`}{" "}
                  Restart the app to start using it.
                </p>
                {result.warnings.map((warning) => (
                  <CardDescription key={warning}>{warning}</CardDescription>
                ))}
                <div>
                  <Button size="sm" onClick={handleRestart}>
                    <RotateCw className="h-4 w-4" />
                    Restart now
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
