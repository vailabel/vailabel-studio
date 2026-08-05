import {
  Clapperboard,
  CloudDownload,
  CloudUpload,
  Edit,
  Play,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/shared/ui/button"
import { ButtonGroup } from "@/shared/ui/button-group"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip"
import { cn } from "@/shared/lib/utils"

/** Refresh / cloud sync / edit / start-labeling actions for the detail header. */
export function ProjectToolbar({
  isVideoProject,
  onOpenVideoEditor,
  onRefresh,
  isLoading,
  cloudTargetName,
  isSyncing,
  onPush,
  onPull,
  onEdit,
  labelingCta,
  canLabel,
  onStartLabeling,
}: {
  isVideoProject: boolean
  onOpenVideoEditor: () => void
  onRefresh: () => void
  isLoading: boolean
  /** Name of the configured cloud target, or undefined when sync is off. */
  cloudTargetName?: string
  isSyncing: boolean
  onPush: () => void
  onPull: () => void
  onEdit: () => void
  labelingCta: string
  canLabel: boolean
  onStartLabeling: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {isVideoProject && (
        <Button size="sm" onClick={onOpenVideoEditor}>
          <Clapperboard />
          Open video editor
        </Button>
      )}

      <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
        <RefreshCw className={cn(isLoading && "animate-spin")} />
        Refresh
      </Button>

      {cloudTargetName && (
        <TooltipProvider>
          <ButtonGroup>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onPush}
                    disabled={isSyncing}
                  >
                    <CloudUpload className={cn(isSyncing && "animate-pulse")} />
                    Push
                  </Button>
                }
              />
              <TooltipContent>Upload items to {cloudTargetName}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onPull}
                    disabled={isSyncing}
                  >
                    <CloudDownload className={cn(isSyncing && "animate-pulse")} />
                    Pull
                  </Button>
                }
              />
              <TooltipContent>Download items from {cloudTargetName}</TooltipContent>
            </Tooltip>
          </ButtonGroup>
        </TooltipProvider>
      )}

      <Button variant="outline" size="sm" onClick={onEdit}>
        <Edit />
        Edit
      </Button>

      <Button size="sm" onClick={onStartLabeling} disabled={!canLabel}>
        <Play />
        {labelingCta}
      </Button>
    </div>
  )
}
