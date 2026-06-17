import { Check, Download, Loader2, X } from "lucide-react"
import { Progress } from "@/shared/ui/progress"
import { useRuntimeInstall } from "@/features/ai-models/components/runtime-install-context"

/**
 * Floating, app-wide indicator for the first-run AI-runtime install. Renders
 * from the RuntimeInstallProvider state, so it stays visible on any page while
 * the ~1.5 GB download runs in the background — the user can keep working and
 * come back.
 */
export function RuntimeInstallIndicator() {
  const { active, done, error, message, percent, dismiss } = useRuntimeInstall()

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
            <Check className="h-4 w-4 text-success" />
          )}
          {active
            ? "Installing AI runtime"
            : error
              ? "AI runtime install failed"
              : "AI runtime installed"}
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

      {active && (
        <div className="mt-3 flex flex-col gap-1.5">
          <Progress value={percent ?? 0} />
          <p className="truncate text-xs text-muted-foreground">
            {percent != null ? `${percent}% · ` : ""}
            {message || "Working…"}
          </p>
          <p className="text-xs text-muted-foreground">
            You can keep working — this runs in the background.
          </p>
        </div>
      )}

      {done && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Download className="h-3.5 w-3.5" />
          AI features are ready to use.
        </p>
      )}

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  )
}
