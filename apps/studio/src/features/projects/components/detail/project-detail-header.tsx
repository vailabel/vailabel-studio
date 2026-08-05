import { ArrowLeft, Calendar } from "lucide-react"
import type { Project } from "@/shared/types/core"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { formatProjectDate } from "@/features/projects/model/format-date"

/** Back link, project identity, and the row of actions. */
export function ProjectDetailHeader({
  project,
  projectName,
  onBack,
  actions,
}: {
  project: Project | null | undefined
  projectName: string
  onBack: () => void
  actions: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="-ml-2 w-fit gap-1.5 text-muted-foreground"
      >
        <ArrowLeft />
        Projects
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-bold text-foreground">
              {projectName}
            </h1>
            {project?.type && (
              <Badge variant="secondary" className="capitalize">
                {project.type}
              </Badge>
            )}
            {project?.status && (
              <Badge variant="outline" className="capitalize">
                {project.status}
              </Badge>
            )}
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {project?.description?.trim() ||
              "No description yet — edit the project to add one."}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="size-3.5" />
            Created {formatProjectDate(project?.createdAt)}
          </p>
        </div>

        {actions}
      </div>
    </div>
  )
}
