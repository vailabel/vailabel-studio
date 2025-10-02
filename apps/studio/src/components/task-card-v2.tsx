import React from "react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
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
  MoreVertical,
  Copy,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
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
        "transition-all duration-300 hover:shadow-xl border-l-4 group hover:scale-105 cursor-pointer",
        priorityColor,
        "bg-card/80 backdrop-blur-sm border-0 shadow-lg"
      )}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold truncate group-hover:text-primary transition-colors">
              {task.name}
            </CardTitle>
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mt-2">
              {task.description}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <TaskPriorityBadge dueDate={task.dueDate} />
            <TaskStatusBadge status={task.status} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Task Details */}
        <div className="space-y-3">
          {task.assignedTo && (
            <div className="flex items-center gap-3 text-sm">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Avatar className="w-6 h-6 ring-2 ring-primary/20">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {task.assignedTo
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium truncate">{task.assignedTo}</span>
              </div>
            </div>
          )}

          {task.dueDate && (
            <div className="flex items-center gap-3 text-sm">
              <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/20">
                <Calendar className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-muted-foreground">Due: </span>
                <span
                  className={cn(
                    "font-medium",
                    isOverdue && "text-red-600 dark:text-red-400 font-semibold"
                  )}
                >
                  {format(new Date(task.dueDate), "MMM dd, yyyy")}
                  {isOverdue && " (Overdue)"}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 text-sm">
            <div className="p-1.5 rounded-lg bg-muted">
              <Clock className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-muted-foreground">Created: </span>
              <span>
                {task.createdAt
                  ? format(new Date(task.createdAt), "MMM dd, yyyy")
                  : "Unknown"}
              </span>
            </div>
          </div>
        </div>

        {/* Labels */}
        {task.labels && task.labels.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {task.labels.slice(0, 3).map((label, index) => (
              <Badge
                key={index}
                variant="outline"
                className="text-xs px-2 py-1 rounded-full border-2 hover:scale-105 transition-transform"
                style={{ borderColor: label.color, color: label.color }}
              >
                {label.name}
              </Badge>
            ))}
            {task.labels.length > 3 && (
              <Badge
                variant="outline"
                className="text-xs px-2 py-1 rounded-full"
              >
                +{task.labels.length - 3} more
              </Badge>
            )}
          </div>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(task)}
              className="h-8 px-2 hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAssign(task.id)}
              className="h-8 px-2 hover:bg-green-100 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 transition-colors"
            >
              <User className="w-4 h-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 hover:bg-muted"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onEdit(task)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Task
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `Task: ${task.name}\nDescription: ${task.description}`
                    )
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(task.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-1">
            {task.status !== "completed" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatusChange(task.id, "completed")}
                className="h-8 text-xs hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-700 hover:text-green-700 dark:hover:text-green-300 transition-colors"
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
                className="h-8 text-xs hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors"
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
