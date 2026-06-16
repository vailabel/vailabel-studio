import { memo } from "react"
import { Check, ChevronLeft, SkipForward } from "lucide-react"
import { Button } from "@/shared/ui/button"
import { Separator } from "@/shared/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip"

interface StudioBottomBarProps {
  currentImageIndex: number
  projectStats: {
    totalImages: number
    labeledImages: number
    totalLabels: number
  }
  hasNext: boolean
  hasPrevious: boolean
  /** The current item already has annotations (drives Submit vs Update wording). */
  isCurrentLabeled: boolean
  onPrevious: () => void
  /** Advance without marking the item done (Label Studio "Skip"). */
  onSkip: () => void
  /** Mark the item done and advance (Label Studio "Submit"/"Update"). UI-only. */
  onSubmit: () => void
}

// Item navigation + progress + task submission (Label Studio style). Previous
// steps back; Skip advances without submitting; Submit/Update finalizes the
// current item (work already autosaves) and advances. ←/→ also navigate.
export const StudioBottomBar = memo(
  ({
    currentImageIndex,
    projectStats,
    hasNext,
    hasPrevious,
    isCurrentLabeled,
    onPrevious,
    onSkip,
    onSubmit,
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

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            disabled={!hasNext}
          >
            <SkipForward className="mr-1 h-4 w-4" />
            Skip
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button size="sm" onClick={onSubmit}>
                    <Check className="mr-1 h-4 w-4" />
                    {isCurrentLabeled ? "Update" : "Submit"}
                  </Button>
                }
              />
              <TooltipContent side="top">
                {hasNext ? "Submit and go to next item" : "Submit this item"}
                <kbd className="ml-2 rounded border border-background/30 bg-background/20 px-1.5 text-xs text-background">
                  Right Arrow
                </kbd>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </footer>
    )
  }
)

StudioBottomBar.displayName = "StudioBottomBar"
