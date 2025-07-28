import React from "react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Calendar,
  User,
  Edit,
  Trash2,
  CheckCircle,
  Play,
  AlertCircle,
  MoreVertical,
  MessageSquare,
  Eye,
  Copy,
  UserPlus,
} from "lucide-react"
import { Task } from "@vailabel/core"
import { cn } from "@/lib/utils"

interface KanbanTaskCardProps {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
  onStatusChange: (taskId: string, status: string) => void
  onAssign: (taskId: string, assignee?: string) => void
  onViewDetails?: (task: Task) => void
  availableUsers?: { id: string; name: string; avatar?: string }[]
}

const getPriorityInfo = (dueDate?: Date) => {
  if (!dueDate) return { color: "", urgency: "none", text: "" }

  const today = new Date()
  const timeDiff = dueDate.getTime() - today.getTime()
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24))

  if (daysDiff < 0)
    return {
      color: "border-l-red-500 bg-red-50 dark:bg-red-950/20",
      urgency: "overdue",
      text: "Overdue",
    }
  if (daysDiff <= 1)
    return {
      color: "border-l-orange-500 bg-orange-50 dark:bg-orange-950/20",
      urgency: "urgent",
      text: "Due soon",
    }
  if (daysDiff <= 3)
    return {
      color: "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20",
      urgency: "medium",
      text: "Due soon",
    }
  return {
    color: "border-l-green-500",
    urgency: "low",
    text: "",
  }
}

export const KanbanTaskCard: React.FC<KanbanTaskCardProps> = ({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  onAssign,
  onViewDetails,
  availableUsers = [],
}) => {
  const priorityInfo = getPriorityInfo(task.dueDate)
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date()

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent card click when clicking on buttons or dropdown
    if (
      (e.target as HTMLElement).closest(
        'button, [role="button"], [data-prevent-click]'
      )
    ) {
      return
    }
    // Only open details when clicking on title or description area
    const target = e.target as HTMLElement
    if (
      target.closest("[data-title-area]") ||
      target.closest("[data-description-area]")
    ) {
      onViewDetails?.(task)
    }
  }

  const handleAssignUser = (userId: string) => {
    const user = availableUsers.find((u) => u.id === userId)
    onAssign(task.id, user?.name)
  }

  const handleUnassign = () => {
    onAssign(task.id, undefined)
  }

  const defaultUsers = [
    { id: "1", name: "John Doe" },
    { id: "2", name: "Jane Smith" },
    { id: "3", name: "Bob Johnson" },
    { id: "4", name: "Alice Brown" },
    { id: "5", name: "Charlie Wilson" },
  ]

  const users = availableUsers.length > 0 ? availableUsers : defaultUsers

  return (
    <Card
      className={cn(
        "transition-all duration-200 border-l-4 group",
        priorityInfo.color
      )}
      onClick={handleCardClick}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header with title and priority indicator */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div
              className="flex-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              data-title-area="true"
            >
              <h3 className="font-semibold text-sm leading-tight line-clamp-2">
                {task.name}
              </h3>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {priorityInfo.urgency !== "none" &&
                priorityInfo.urgency !== "low" && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-xs px-2 py-0.5",
                      priorityInfo.urgency === "overdue" &&
                        "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
                      priorityInfo.urgency === "urgent" &&
                        "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
                    )}
                  >
                    {priorityInfo.urgency === "overdue" && (
                      <AlertCircle className="w-3 h-3 mr-1" />
                    )}
                    {priorityInfo.text}
                  </Badge>
                )}
            </div>
          </div>

          {task.description && (
            <div
              className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              data-description-area="true"
            >
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {task.description}
              </p>
            </div>
          )}
        </div>

        {/* Task metadata */}
        <div className="space-y-2">
          {/* Assignment - Azure DevOps style inline assignment */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              {task.assignedTo ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded"
                      data-prevent-click="true"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5">
                          <AvatarFallback className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                            {task.assignedTo
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate max-w-20">
                          {task.assignedTo}
                        </span>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem
                      onClick={handleUnassign}
                      className="text-red-600 focus:text-red-600"
                    >
                      <User className="w-4 h-4 mr-2" />
                      Unassign
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {users.map((user) => (
                      <DropdownMenuItem
                        key={user.id}
                        onClick={() => handleAssignUser(user.id)}
                        className={
                          task.assignedTo === user.name
                            ? "bg-blue-50 dark:bg-blue-950"
                            : ""
                        }
                      >
                        <Avatar className="w-4 h-4 mr-2">
                          <AvatarFallback className="text-xs bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            {user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {user.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded text-xs text-slate-500 hover:text-blue-600"
                      data-prevent-click="true"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center">
                          <UserPlus className="w-3 h-3" />
                        </div>
                        <span>Assign</span>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    {users.map((user) => (
                      <DropdownMenuItem
                        key={user.id}
                        onClick={() => handleAssignUser(user.id)}
                      >
                        <Avatar className="w-4 h-4 mr-2">
                          <AvatarFallback className="text-xs bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            {user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {user.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Quick Actions - Azure DevOps style */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {task.status === "pending" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-blue-600"
                  onClick={(e) => {
                    e.stopPropagation()
                    onStatusChange(task.id, "in-progress")
                  }}
                  title="Start Task"
                  data-prevent-click="true"
                >
                  <Play className="h-3 w-3" />
                </Button>
              )}
              {task.status !== "completed" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-green-50 dark:hover:bg-green-950/50 text-green-600"
                  onClick={(e) => {
                    e.stopPropagation()
                    onStatusChange(task.id, "completed")
                  }}
                  title="Mark Complete"
                  data-prevent-click="true"
                >
                  <CheckCircle className="h-3 w-3" />
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={(e) => e.stopPropagation()}
                    data-prevent-click="true"
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onViewDetails?.(task)}>
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onViewDetails?.(task)}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Comments & Discussion
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
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
          </div>

          {/* Due date */}
          {task.dueDate && (
            <div className="flex items-center gap-2">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              <span
                className={cn(
                  "text-xs font-medium",
                  isOverdue && "text-red-600 dark:text-red-400"
                )}
              >
                {format(new Date(task.dueDate), "MMM dd")}
              </span>
            </div>
          )}

          {/* Labels */}
          {task.labels && task.labels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {task.labels.slice(0, 2).map((label, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs px-1.5 py-0.5 h-auto"
                  style={{
                    borderColor: label.color + "40",
                    backgroundColor: label.color + "10",
                    color: label.color,
                  }}
                >
                  {label.name}
                </Badge>
              ))}
              {task.labels.length > 2 && (
                <Badge
                  variant="outline"
                  className="text-xs px-1.5 py-0.5 h-auto"
                >
                  +{task.labels.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Quick actions - only show on hover */}
        <div className="flex items-center justify-end pt-2 border-t opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-xs text-muted-foreground">
            {task.status === "completed"
              ? "Completed"
              : task.status === "in-progress"
                ? "In Progress"
                : "Pending"}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
