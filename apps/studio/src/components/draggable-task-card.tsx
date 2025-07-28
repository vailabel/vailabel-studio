import React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { KanbanTaskCard } from "@/components/kanban-task-card"
import { Task } from "@vailabel/core"

interface DraggableTaskCardProps {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
  onStatusChange: (taskId: string, status: string) => void
  onAssign: (taskId: string, assignee?: string) => void
  onViewDetails?: (task: Task) => void
  availableUsers?: { id: string; name: string; avatar?: string }[]
}

export const DraggableTaskCard: React.FC<DraggableTaskCardProps> = ({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  onAssign,
  onViewDetails,
  availableUsers,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: task.id,
    data: {
      type: "task",
      task,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? "none" : transition,
    opacity: isDragging ? 0.6 : 1,
    cursor: isDragging ? "grabbing" : "grab",
    zIndex: isDragging ? 1000 : "auto",
    // Prevent overflow during drag
    maxWidth: isDragging ? "280px" : "100%",
    overflow: "hidden",
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`touch-none relative ${
        isDragging
          ? "rotate-2 scale-110 shadow-2xl z-50"
          : isOver
            ? "border-2 border-blue-400 bg-blue-50/50 dark:bg-blue-950/50"
            : "transition-all duration-200"
      }`}
    >
      <KanbanTaskCard
        task={task}
        onEdit={onEdit}
        onDelete={onDelete}
        onStatusChange={onStatusChange}
        onAssign={onAssign}
        onViewDetails={onViewDetails}
        availableUsers={availableUsers}
      />
    </div>
  )
}
