import React from "react"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DraggableTaskCard } from "@/components/draggable-task-card"
import { Task } from "@vailabel/core"
import { cn } from "@/lib/utils"

interface DroppableColumnProps {
  id: string
  title: string
  color: string
  tasks: Task[]
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
  onStatusChange: (taskId: string, status: string) => void
  onAssign: (taskId: string, assignee?: string) => void
  onViewDetails?: (task: Task) => void
  availableUsers?: { id: string; name: string; avatar?: string }[]
}

export const DroppableColumn: React.FC<DroppableColumnProps> = ({
  id,
  title,
  color,
  tasks,
  onEdit,
  onDelete,
  onStatusChange,
  onAssign,
  onViewDetails,
  availableUsers,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${id}`,
    data: {
      type: "column",
      status: id,
    },
  })

  return (
    <Card
      className={cn(
        "flex flex-col transition-all duration-200 h-full",
        color,
        isOver && "ring-2 ring-primary ring-offset-2 scale-[1.02] shadow-lg"
      )}
    >
      <CardHeader className="pb-3 px-4 pt-4 border-b bg-muted/30">
        <CardTitle className="flex items-center justify-between text-sm font-semibold">
          {title}
          <Badge variant="secondary" className="ml-2 text-xs bg-background">
            {tasks.length}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent
        className="flex-1 pt-4 px-2 pb-4 overflow-hidden"
        ref={setNodeRef}
      >
        <SortableContext
          items={tasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          <div
            className={cn(
              "space-y-3 h-full overflow-y-auto transition-all duration-200 pb-4 px-1",
              isOver && "bg-primary/5 rounded-lg p-2 -m-2 scale-[1.01]"
            )}
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(155, 155, 155, 0.5) transparent",
            }}
          >
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <DraggableTaskCard
                  key={task.id}
                  task={task}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onStatusChange={onStatusChange}
                  onAssign={onAssign}
                  onViewDetails={onViewDetails}
                  availableUsers={availableUsers}
                />
              ))
            ) : (
              <div
                className={cn(
                  "flex flex-col items-center justify-center h-32 text-muted-foreground border-2 border-dashed border-muted rounded-lg transition-all duration-200",
                  isOver &&
                    "border-primary bg-primary/10 text-primary scale-105 shadow-md"
                )}
              >
                <div className="text-2xl mb-2">📋</div>
                <p className="text-xs font-medium text-center">
                  {isOver ? "✨ Drop task here" : "No tasks"}
                </p>
              </div>
            )}
          </div>
        </SortableContext>
      </CardContent>
    </Card>
  )
}
