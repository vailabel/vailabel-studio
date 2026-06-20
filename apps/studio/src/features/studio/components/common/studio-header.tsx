import { memo } from "react"
import { ArrowLeft, Download, Settings } from "lucide-react"
import { Button } from "@/shared/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip"
import { ThemeToggle } from "@/shared/ui/theme-toggle"

interface StudioHeaderProps {
  projectName: string
  projectStats: {
    totalItems: number
    labeledItems: number
    totalLabels: number
  }
  isLoading: boolean
  onBack: () => void
  onOpenSettings: () => void
  onExport: () => void | Promise<void>
  isExporting: boolean
}

// Project-level header — back, name/progress, theme, export, settings. Shared by
// every editor (modality-agnostic).
export const StudioHeader = memo(
  ({
    projectName,
    projectStats,
    isLoading,
    onBack,
    onOpenSettings,
    onExport,
    isExporting,
  }: StudioHeaderProps) => {
    return (
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-foreground">
              {projectName}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isLoading
                ? "Loading project stats…"
                : `${projectStats.labeledItems} of ${projectStats.totalItems} items labeled · ${projectStats.totalLabels} labels`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button variant="outline" onClick={() => void onExport()} disabled={isExporting}>
                    <Download className="mr-2 h-4 w-4" />
                    {isExporting ? "Exporting..." : "Export"}
                  </Button>
                }
              />
              <TooltipContent>Export the project's annotations.</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button variant="outline" size="icon" onClick={onOpenSettings}>
                    <Settings className="h-4 w-4" />
                  </Button>
                }
              />
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>
    )
  }
)

StudioHeader.displayName = "StudioHeader"
