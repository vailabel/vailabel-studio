import { Loader2, RotateCw, X, Zap } from "lucide-react"
import { Button } from "@/shared/ui/button"
import { Progress } from "@/shared/ui/progress"
import { useGpuInstall } from "@/features/ai-models/components/gpu-install-context"

/**
 * Floating, app-wide indicator for the GPU (CUDA PyTorch) install. Renders from
 * the GpuInstallProvider state, so it stays visible on any page while the ~2 GB
 * download runs in the background — the user can keep working and come back.
 */
export function GpuInstallIndicator() {
  const { active, done, error, message, percent, gpuName, dismiss, restartApp } =
    useGpuInstall()

  if (!active && !done && !error) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 rounded-lg border border-border bg-card p-4 shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          {active ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : error ? (
            <X className="h-4 w-4 text-destructive" />
          ) : (
            <Zap className="h-4 w-4 text-warning" />
          )}
          {active
            ? "Installing GPU acceleration"
            : error
              ? "GPU install failed"
              : "GPU acceleration ready"}
        </div>
        {!active && (
          <button
            type="button"
            onClick={dismiss}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {gpuName && <p className="mt-1 text-xs text-muted-foreground">{gpuName}</p>}

      {active && (
        <div className="mt-3 flex flex-col gap-1.5">
          <Progress value={percent ?? 0} />
          <p className="truncate text-xs text-muted-foreground">
            {percent != null ? `${percent}% · ` : ""}
            {message || "Downloading…"}
          </p>
          <p className="text-xs text-muted-foreground">
            You can keep working — this runs in the background.
          </p>
        </div>
      )}

      {done && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            Restart the app to start using your GPU.
          </p>
          <div>
            <Button size="sm" onClick={restartApp}>
              <RotateCw className="h-4 w-4" />
              Restart app
            </Button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  )
}
