import { Plus, Tag } from "lucide-react"
import type { Label } from "@/shared/types/core"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/shared/ui/empty"
import { ClassCard } from "./class-card"
import { TabHeading } from "./tab-heading"

export function ClassesTab({
  labels,
  labelCounts,
  maxLabelCount,
  totalLabels,
  isMutating,
  onAddClass,
  onDeleteClass,
}: {
  labels: Label[]
  labelCounts: Map<string, number>
  maxLabelCount: number
  totalLabels: number
  isMutating: boolean
  onAddClass: () => void
  onDeleteClass: (id: string) => void
}) {
  return (
    <>
      <TabHeading
        title="Classes"
        actions={
          <>
            <Badge variant="secondary">{totalLabels} total</Badge>
            <Button size="sm" onClick={onAddClass}>
              <Plus />
              Add class
            </Button>
          </>
        }
      />

      {labels.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {labels.map((label) => (
            <ClassCard
              key={label.id}
              label={label}
              count={labelCounts.get(label.id) ?? 0}
              maxCount={maxLabelCount}
              isDeleting={isMutating}
              onDelete={() => onDeleteClass(label.id)}
            />
          ))}
        </div>
      ) : (
        <Empty className="rounded-xl border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Tag />
            </EmptyMedia>
            <EmptyTitle>No classes yet</EmptyTitle>
            <EmptyDescription>
              Add classes to start annotating, or they'll be created on the fly
              while labeling.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={onAddClass}>
              <Plus />
              Add your first class
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </>
  )
}
