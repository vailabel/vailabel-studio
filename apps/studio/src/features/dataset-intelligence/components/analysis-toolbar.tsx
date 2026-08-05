import { Download, Play } from "lucide-react"
import { Button } from "@/shared/ui/button"
import { ButtonGroup } from "@/shared/ui/button-group"
import { Checkbox } from "@/shared/ui/checkbox"
import { Label } from "@/shared/ui/label"
import { Spinner } from "@/shared/ui/spinner"

/** Run/export controls in the dashboard header. */
export function AnalysisToolbar({
  includeImageQuality,
  onIncludeImageQualityChange,
  isRunning,
  canExport,
  onRun,
  onExport,
}: {
  includeImageQuality: boolean
  onIncludeImageQualityChange: (value: boolean) => void
  isRunning: boolean
  canExport: boolean
  onRun: () => void
  onExport: (format: "json" | "markdown") => void
}) {
  return (
    <div className="flex items-center gap-2">
      <Label
        htmlFor="include-image-quality"
        className="mr-1 cursor-pointer text-sm font-normal text-muted-foreground"
      >
        <Checkbox
          id="include-image-quality"
          checked={includeImageQuality}
          onCheckedChange={onIncludeImageQualityChange}
          disabled={isRunning}
        />
        Analyze image pixels
      </Label>

      {canExport && (
        <ButtonGroup>
          <Button variant="outline" size="sm" onClick={() => onExport("json")}>
            <Download />
            JSON
          </Button>
          <Button variant="outline" size="sm" onClick={() => onExport("markdown")}>
            <Download />
            Markdown
          </Button>
        </ButtonGroup>
      )}

      <Button size="sm" onClick={onRun} disabled={isRunning}>
        {isRunning ? <Spinner /> : <Play />}
        {isRunning ? "Analyzing..." : "Run Analysis"}
      </Button>
    </div>
  )
}
