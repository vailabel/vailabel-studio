import { Trash2 } from "lucide-react"
import { Button } from "@/shared/ui/button"
import { SettingsSection } from "@/features/settings/components/settings-ui"

export default function AdvancedSettings() {
  return (
    <SettingsSection
      icon={Trash2}
      title="Clear All Data"
      description="Permanently remove all locally stored workspace data"
    >
      <div className="flex flex-col items-start gap-4">
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <p>
            This will{" "}
            <span className="font-semibold underline">permanently delete</span>{" "}
            all data stored locally by the app.{" "}
            <span className="font-semibold">This action cannot be undone.</span>
          </p>
        </div>
        <Button
          type="button"
          variant="destructive"
          disabled
          className="w-full gap-2"
          aria-label="Clear all data"
          aria-describedby="clear-data-warning"
          data-testid="clear-all-data-btn"
        >
          <Trash2 className="h-4 w-4" />
          Clear All Data
        </Button>
        <span id="clear-data-warning" className="sr-only">
          Warning: This action is irreversible and will delete all your data.
        </span>
        <p className="text-xs text-muted-foreground">
          Destructive workspace clearing is intentionally disabled until the
          desktop storage flow exposes a supported backup and restore command.
        </p>
      </div>
    </SettingsSection>
  )
}
