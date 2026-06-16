import { memo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface StudioBottomBarProps {
  currentImageIndex: number
  projectStats: {
    totalImages: number
    labeledImages: number
    totalLabels: number
  }
  hasNext: boolean
  hasPrevious: boolean
  onNext: () => void
  onPrevious: () => void
}

// Item navigation + progress (Label Studio style), shared by every editor.
export const StudioBottomBar = memo(
  ({
    currentImageIndex,
    projectStats,
    hasNext,
    hasPrevious,
    onNext,
    onPrevious,
  }: StudioBottomBarProps) => {
    const progress =
      projectStats.totalImages > 0
        ? Math.round(
            (projectStats.labeledImages / projectStats.totalImages) * 100
          )
        : 0

    return (
      <footer className="flex items-center justify-between border-t border-border bg-card px-4 py-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPrevious}
                  disabled={!hasPrevious}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
              }
            />
            <TooltipContent side="top">
              Previous item
              <kbd className="ml-2 rounded border border-background/30 bg-background/20 px-1.5 text-xs text-background">
                Left Arrow
              </kbd>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {currentImageIndex >= 0 && projectStats.totalImages > 0 ? (
            <span className="font-medium text-foreground">
              Item {currentImageIndex + 1} of {projectStats.totalImages}
            </span>
          ) : null}
          <Separator orientation="vertical" className="h-4" />
          <span>
            {projectStats.labeledImages}/{projectStats.totalImages} labeled ·{" "}
            {progress}%
          </span>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button size="sm" onClick={onNext} disabled={!hasNext}>
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              }
            />
            <TooltipContent side="top">
              Next item
              <kbd className="ml-2 rounded border border-background/30 bg-background/20 px-1.5 text-xs text-background">
                Right Arrow
              </kbd>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </footer>
    )
  }
)

StudioBottomBar.displayName = "StudioBottomBar"
