import { Trash2 } from "lucide-react"

export default function AdvancedSettings() {
  return (
    <div className="bg-muted dark:bg-muted/40 rounded-xl p-6 flex flex-col items-start gap-4 shadow-sm w-full">
      <div className="flex items-center gap-3 mb-1">
        <Trash2 className="h-6 w-6 text-destructive" aria-hidden="true" />
        <span className="text-lg font-semibold text-foreground">
          Clear All Data
        </span>
      </div>
      <p className="text-sm text-muted-foreground font-medium">
        This will{" "}
        <span className="font-bold underline text-destructive">
          permanently delete
        </span>{" "}
        all data from your browser's local storage and any other storage used by
        the app.
        <br />
        <span className="font-bold text-destructive">
          This action cannot be undone.
        </span>
      </p>
      <button
        type="button"
        disabled
        className="mt-2 w-full flex items-center justify-center gap-2 px-5 py-3 text-base font-semibold rounded-lg bg-destructive hover:bg-destructive/90 focus:ring-2 focus:ring-destructive/40 focus:outline-none text-white shadow-sm transition disabled:bg-destructive/40 disabled:cursor-not-allowed"
        aria-label="Clear all data"
        aria-disabled="true"
        aria-describedby="clear-data-warning"
        data-testid="clear-all-data-btn"
      >
        <Trash2 className="h-5 w-5" />
        Clear All Data
      </button>
      <span id="clear-data-warning" className="sr-only">
        Warning: This action is irreversible and will delete all your data.
      </span>
      <p className="text-xs text-muted-foreground">
        Destructive workspace clearing is intentionally disabled until the
        desktop storage flow exposes a supported backup and restore command.
      </p>
    </div>
  )
}
