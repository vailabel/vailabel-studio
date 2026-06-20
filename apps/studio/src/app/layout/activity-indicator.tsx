import { Check, Loader2, RotateCw, X } from "lucide-react"
import { Button } from "@/shared/ui/button"
import { Progress } from "@/shared/ui/progress"
import { aiRuntimeService } from "@/shared/services/ai-runtime-service"
import { useActivity } from "@/shared/model/activity-context"
import type { Activity } from "@/shared/types/activity"

/**
 * Global, app-wide indicator for everything the backend is doing — a single
 * stack of cards fed by the unified `studio://activity` channel. Stays visible
 * on any page while downloads/installs/ingest/analysis/training/cloud-sync run
 * in the Rust backend, so the user can keep working and watch progress. Replaces
 * the per-feature install indicators.
 */
export function ActivityIndicator() {
  const { activities, dismiss } = useActivity()
  if (activities.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
      {activities.map((activity) => (
        <ActivityCard
          key={activity.id}
          activity={activity}
          onDismiss={() => dismiss(activity.id)}
        />
      ))}
    </div>
  )
}

function ActivityCard({
  activity,
  onDismiss,
}: {
  activity: Activity
  onDismiss: () => void
}) {
  const active = activity.phase === "active"
  const error = activity.phase === "error"
  const done = activity.phase === "done"
  const percent = activity.percent != null ? Math.round(activity.percent) : null

  // A freshly-installed CUDA overlay needs an app restart to take effect.
  const needsRestart = done && activity.kind === "gpu-install"

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          {active ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : error ? (
            <X className="h-4 w-4 text-destructive" />
          ) : (
            <Check className="h-4 w-4 text-success" />
          )}
          {activity.title}
        </div>
        {!active && (
          <button
            type="button"
            onClick={onDismiss}
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
            {activity.message || "Working…"}
          </p>
          <p className="text-xs text-muted-foreground">
            You can keep working — this runs in the background.
          </p>
        </div>
      )}

      {done && needsRestart && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            {activity.message || "Restart the app to activate it."}
          </p>
          <div>
            <Button size="sm" onClick={() => void aiRuntimeService.restartApp()}>
              <RotateCw className="h-4 w-4" />
              Restart app
            </Button>
          </div>
        </div>
      )}

      {done && !needsRestart && activity.message && (
        <p className="mt-2 text-xs text-muted-foreground">{activity.message}</p>
      )}

      {error && (
        <p className="mt-2 text-xs text-destructive">
          {activity.message || "Something went wrong."}
        </p>
      )}
    </div>
  )
}
