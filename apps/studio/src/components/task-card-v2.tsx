import React from "react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { TaskStatusBadge } from "@/components/task-status-badge"
import { TaskPriorityBadge } from "@/components/task-priority-badge"
import {
  Calendar,
  Clock,
  User,
  Edit,
  Trash2,
  CheckCircle,
  Play,
} from "lucide-react"
import { Task } from "@vailabel/core"
import { cn } from "@/lib/utils"

interface TaskCardProps {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
  onStatusChange: (taskId: string, status: string) => void
  onAssign: (taskId: string) => void
}

const getPriorityColor = (dueDate?: Date) => {
  if (!dueDate) return ""

  const today = new Date()
  const timeDiff = dueDate.getTime() - today.getTime()
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24))

  if (daysDiff < 0) return "border-l-red-500" // Overdue
  if (daysDiff <= 1) return "border-l-orange-500" // Due today/tomorrow
  if (daysDiff <= 3) return "border-l-yellow-500" // Due soon
  return "border-l-green-500" // Future
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  onAssign,
}) => {
  const priorityColor = getPriorityColor(task.dueDate)
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date()

  return (
    <Card
      className={cn(
        "transition-all duration-200 hover:shadow-md border-l-4",
        priorityColor
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-semibold truncate pr-2">
            {task.name}
          </CardTitle>
          <div className="flex items-center gap-2 flex-shrink-0">
            <TaskPriorityBadge dueDate={task.dueDate} />
            <TaskStatusBadge status={task.status} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {task.description}
        </p>

        {/* Task Details */}
        <div className="space-y-2">
          {task.assignedTo && (
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Assigned to:</span>
              <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="text-xs">
                    {task.assignedTo
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{task.assignedTo}</span>
              </div>
            </div>
          )}

          {task.dueDate && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Due:</span>
              <span
                className={cn(
                  "font-medium",
                  isOverdue && "text-red-600 dark:text-red-400"
                )}
              >
                {format(new Date(task.dueDate), "MMM dd, yyyy")}
                {isOverdue && " (Overdue)"}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Created:</span>
            <span>
              {task.createdAt
                ? format(new Date(task.createdAt), "MMM dd, yyyy")
                : "Unknown"}
            </span>
          </div>
        </div>

        {/* Labels */}
        {task.labels && task.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.labels.slice(0, 3).map((label, index) => (
              <Badge
                key={index}
                variant="outline"
                className="text-xs"
                style={{ borderColor: label.color, color: label.color }}
              >
                {label.name}
              </Badge>
            ))}
            {task.labels.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{task.labels.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(task)}
              className="h-8 px-2"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAssign(task.id)}
              className="h-8 px-2"
            >
              <User className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(task.id)}
              className="h-8 px-2 text-red-500 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1">
            {task.status !== "completed" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatusChange(task.id, "completed")}
                className="h-8 text-xs"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Complete
              </Button>
            )}
            {task.status === "pending" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatusChange(task.id, "in-progress")}
                className="h-8 text-xs"
              >
                <Play className="w-3 h-3 mr-1" />
                Start
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
