import React from "react"
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable"
import { KanbanTaskCard } from "@/components/kanban-task-card"
import { DroppableColumn } from "@/components/droppable-column"
import { Task } from "@vailabel/core"

interface TaskKanbanProps {
  tasks: Task[]
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
  onStatusChange: (taskId: string, status: string) => void
  onAssign: (taskId: string, assignee?: string) => void
  onTaskMove?: (taskId: string, newStatus: string, newPosition?: number) => void
  onViewDetails?: (task: Task) => void
  availableUsers?: { id: string; name: string; avatar?: string }[]
}

const columns = [
  {
    id: "pending",
    title: "Pending",
    color:
      "bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800",
  },
  {
    id: "in-progress",
    title: "In Progress",
    color: "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800",
  },
  {
    id: "completed",
    title: "Completed",
    color:
      "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800",
  },
  {
    id: "blocked",
    title: "Blocked",
    color: "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800",
  },
]

export const TaskKanban: React.FC<TaskKanbanProps> = ({
  tasks,
  onEdit,
  onDelete,
  onStatusChange,
  onAssign,
  onTaskMove,
  onViewDetails,
  availableUsers,
}) => {
  const [activeTask, setActiveTask] = React.useState<Task | null>(null)
  const [localTasks, setLocalTasks] = React.useState<Task[]>(tasks)

  // Update local tasks when props change
  React.useEffect(() => {
    setLocalTasks(tasks)
  }, [tasks])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Custom collision detection that prioritizes tasks over columns
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customCollisionDetection = (args: any) => {
    // First, let's see if there are any collisions with tasks
    const pointerIntersections = pointerWithin(args)
    const intersections =
      pointerIntersections.length > 0
        ? pointerIntersections
        : rectIntersection(args)

    // If we're dragging over a task, prioritize it
    const taskCollisions = intersections.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (collision: any) =>
        collision.data?.droppableContainer?.data?.current?.type === "task"
    )

    if (taskCollisions.length > 0) {
      return taskCollisions
    }

    // Otherwise, return all intersections
    return intersections.length > 0 ? intersections : closestCenter(args)
  }

  const getTasksByStatus = (status: string) => {
    return localTasks.filter((task) => task.status === status)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const task = localTasks.find((t) => t.id === active.id)
    setActiveTask(task || null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event

    if (!over) return

    const activeId = active.id
    const overId = over.id

    if (activeId === overId) return

    const activeTask = localTasks.find((task) => task.id === activeId)
    if (!activeTask) return

    const isOverATask = over.data.current?.type === "task"
    const isOverAColumn = over.data.current?.type === "column"

    if (isOverATask) {
      const overTask = localTasks.find((task) => task.id === overId)
      if (!overTask) return

      // If dragging over a task in the same column, reorder
      if (activeTask.status === overTask.status) {
        setLocalTasks((tasks) => {
          const activeIndex = tasks.findIndex((t) => t.id === activeId)
          const overIndex = tasks.findIndex((t) => t.id === overId)
          return arrayMove(tasks, activeIndex, overIndex)
        })
      } else {
        // Moving to a different column
        setLocalTasks((tasks) => {
          const activeIndex = tasks.findIndex((t) => t.id === activeId)
          const overIndex = tasks.findIndex((t) => t.id === overId)

          // Update the task status
          const updatedTasks = [...tasks]
          updatedTasks[activeIndex] = {
            ...updatedTasks[activeIndex],
            status: overTask.status,
          }

          return arrayMove(updatedTasks, activeIndex, overIndex)
        })
      }
    } else if (isOverAColumn) {
      const newStatus = over.data.current?.status
      if (activeTask.status !== newStatus) {
        setLocalTasks((tasks) => {
          const activeIndex = tasks.findIndex((t) => t.id === activeId)
          const updatedTasks = [...tasks]
          updatedTasks[activeIndex] = {
            ...updatedTasks[activeIndex],
            status: newStatus,
          }
          return updatedTasks
        })
      }
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    // Clear active task immediately to prevent bounce animation
    setActiveTask(null)

    if (!over) {
      // Reset to original state if dropped outside
      setLocalTasks(tasks)
      return
    }

    const activeTask = localTasks.find((t) => t.id === active.id)
    const originalTask = tasks.find((t) => t.id === active.id)

    if (!activeTask || !originalTask) return

    // Check if the task actually moved
    const overData = over.data.current
    if (overData?.type === "column" || overData?.type === "task") {
      const newStatus =
        overData.type === "column"
          ? overData.status
          : localTasks.find((t) => t.id === over.id)?.status

      if (newStatus && originalTask.status !== newStatus) {
        if (onTaskMove) {
          onTaskMove(activeTask.id, newStatus)
        } else {
          onStatusChange(activeTask.id, newStatus)
        }
      }
    }
  }

  return (
    <div className="w-full overflow-hidden">
      <DndContext
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 h-[calc(100vh-500px)] min-h-[600px] overflow-hidden relative">
          {columns.map((column) => {
            const columnTasks = getTasksByStatus(column.id)

            return (
              <DroppableColumn
                key={column.id}
                id={column.id}
                title={column.title}
                color={column.color}
                tasks={columnTasks}
                onEdit={onEdit}
                onDelete={onDelete}
                onStatusChange={onStatusChange}
                onAssign={onAssign}
                onViewDetails={onViewDetails}
                availableUsers={availableUsers}
              />
            )
          })}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <div
              className="transform rotate-2 opacity-95 shadow-2xl transition-none max-w-[280px] overflow-hidden"
              style={{
                pointerEvents: "none",
              }}
            >
              <div className="[&_button]:pointer-events-none [&_[role=button]]:pointer-events-none">
                <KanbanTaskCard
                  task={activeTask}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  onStatusChange={() => {}}
                  onAssign={() => {}}
                  onViewDetails={() => {}}
                  availableUsers={[]}
                />
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
