import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function AdvancedSettings() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-lg">
          <Trash2 className="size-5 text-destructive" aria-hidden="true" />
          Clear All Data
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-start gap-4">
        <p className="text-sm text-muted-foreground">
          This will{" "}
          <span className="font-bold text-destructive underline">
            permanently delete
          </span>{" "}
          all data from your browser's local storage and any other storage used
          by the app.
          <br />
          <span className="font-bold text-destructive">
            This action cannot be undone.
          </span>
        </p>
        <Button
          type="button"
          variant="destructive"
          size="lg"
          disabled
          className="w-full"
          aria-label="Clear all data"
          aria-describedby="clear-data-warning"
          data-testid="clear-all-data-btn"
        >
          <Trash2 />
          Clear All Data
        </Button>
        <span id="clear-data-warning" className="sr-only">
          Warning: This action is irreversible and will delete all your data.
        </span>
        <p className="text-xs text-muted-foreground">
          Destructive workspace clearing is intentionally disabled until the
          desktop storage flow exposes a supported backup and restore command.
        </p>
      </CardContent>
    </Card>
  )
}
