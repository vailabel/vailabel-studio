import { CircleAlert } from "lucide-react"
import { Button } from "@/shared/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/shared/ui/empty"
import { Spinner } from "@/shared/ui/spinner"

export function ProjectDetailLoading() {
  return (
    <Empty className="h-64">
      <EmptyHeader>
        <Spinner className="size-6" />
        <EmptyDescription>Loading project data…</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

export function ProjectDetailError({
  error,
  onRetry,
}: {
  error: unknown
  onRetry: () => void
}) {
  return (
    <Empty className="rounded-xl border border-dashed border-destructive/40">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
          <CircleAlert />
        </EmptyMedia>
        <EmptyTitle className="text-destructive">Error loading project</EmptyTitle>
        <EmptyDescription>
          {typeof error === "string" ? error : "An unexpected error occurred."}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </EmptyContent>
    </Empty>
  )
}
