import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Task } from "@vailabel/core"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Clock,
  Edit,
  Save,
  X,
  MessageSquare,
  FileText,
  Calendar,
  User,
  Tag,
  AlertCircle,
  CheckCircle,
  Play,
  Archive,
  Copy,
  Share,
  MoreVertical,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Comment {
  id: string
  author: string
  content: string
  timestamp: Date
  type: "comment" | "system"
}

interface TaskDetailDialogProps {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave?: (task: Task) => void
  onStatusChange?: (taskId: string, status: string) => void
  mode?: "view" | "edit"
}

export function TaskDetailDialog({
  task,
  open,
  onOpenChange,
  onSave,
  onStatusChange,
  mode: initialMode = "view",
}: TaskDetailDialogProps) {
  const [newComment, setNewComment] = useState("")
  const [mode, setMode] = useState<"view" | "edit">(initialMode)
  const [editedTask, setEditedTask] = useState<Task | null>(null)
  const [activeTab, setActiveTab] = useState<"details" | "activity">("details")
  const [comments, setComments] = useState<Comment[]>([
    {
      id: "1",
      author: "John Doe",
      content:
        "I've started working on this task. The initial analysis looks good.",
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      type: "comment",
    },
    {
      id: "2",
      author: "System",
      content: "Task status changed from Pending to In Progress",
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      type: "system",
    },
    {
      id: "3",
      author: "Jane Smith",
      content:
        "Great progress! Can you also check the edge cases we discussed?",
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      type: "comment",
    },
  ])

  // Initialize edited task when task or mode changes
  useEffect(() => {
    if (task && mode === "edit") {
      setEditedTask({ ...task })
    } else {
      setEditedTask(null)
    }
  }, [task, mode])

  // Reset mode when dialog opens/closes
  useEffect(() => {
    if (open) {
      setMode(initialMode)
    }
  }, [open, initialMode])

  const handleCancelEdit = () => {
    setMode("view")
    setEditedTask(null)
  }

  const handleSaveTask = () => {
    if (editedTask && onSave) {
      onSave(editedTask)
      setMode("view")
      setEditedTask(null)
    }
  }

  const handleTaskFieldChange = (
    field: keyof Task,
    value: string | Date | null | { id: number; name: string }[]
  ) => {
    if (editedTask) {
      setEditedTask({
        ...editedTask,
        [field]: value,
      })
    }
  }

  const handleAddComment = () => {
    if (!newComment.trim()) return

    const comment: Comment = {
      id: Date.now().toString(),
      author: "Current User",
      content: newComment,
      timestamp: new Date(),
      type: "comment",
    }

    setComments([...comments, comment])
    setNewComment("")
  }

  const getPriorityBadge = (task: Task) => {
    if (!task.dueDate) return null

    const today = new Date()
    const timeDiff = task.dueDate.getTime() - today.getTime()
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24))

    if (daysDiff < 0) {
      return (
        <Badge variant="destructive" className="text-xs">
          Overdue
        </Badge>
      )
    } else if (daysDiff === 0) {
      return (
        <Badge variant="destructive" className="text-xs">
          Due Today
        </Badge>
      )
    } else if (daysDiff <= 3) {
      return (
        <Badge
          variant="secondary"
          className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
        >
          Due Soon
        </Badge>
      )
    }
    return null
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      todo: {
        label: "New",
        className:
          "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700",
      },
      "in-progress": {
        label: "Active",
        className:
          "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-700",
      },
      done: {
        label: "Closed",
        className:
          "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700",
      },
      pending: {
        label: "New",
        className:
          "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700",
      },
      completed: {
        label: "Closed",
        className:
          "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700",
      },
    }

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending

    return (
      <Badge
        variant="outline"
        className={cn("text-xs font-medium", config.className)}
      >
        {config.label}
      </Badge>
    )
  }

  if (!task) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0"
        hideCloseButton={false}
      >
        {/* Enhanced Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold shadow-lg">
                {task.id.slice(-4)}
              </div>
              <div className="flex flex-col">
                <DialogTitle className="text-xl font-semibold">
                  {mode === "edit" ? "Edit Task" : task.name}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-muted-foreground">
                    Task #{task.id}
                  </span>
                  {getStatusBadge(task.status)}
                  {getPriorityBadge(task)}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {mode === "edit" ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="gap-2 hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveTask}
                  className="gap-2 shadow-lg"
                  disabled={!editedTask}
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(`Task: ${task.name}\nDescription: ${task.description}`)
                  }}
                  className="gap-2 hover:bg-muted"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMode("edit")
                    if (task) {
                      setEditedTask({ ...task })
                    }
                  }}
                  className="gap-2 hover:bg-muted"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Tabs */}
        <div className="border-b bg-background">
          <div className="flex px-6">
            <button
              onClick={() => setActiveTab("details")}
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200 flex items-center gap-2",
                activeTab === "details"
                  ? "border-primary text-primary bg-primary/10"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <FileText className="w-4 h-4" />
              Details
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200 flex items-center gap-2",
                activeTab === "activity"
                  ? "border-primary text-primary bg-primary/10"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <MessageSquare className="w-4 h-4" />
              Activity
              <Badge variant="secondary" className="text-xs h-5 px-1.5 ml-1">
                {comments.filter((c) => c.type === "comment").length}
              </Badge>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {activeTab === "details" ? (
            /* Enhanced Details Tab Content */
            <div className="flex-1 flex overflow-hidden">
              {/* Left Panel - Main Content */}
              <div className="flex-1 overflow-auto p-6 space-y-6">
                {mode === "view" ? (
                  <>
                    {/* Task Overview Card */}
                    <Card className="border-0 shadow-lg bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-900">
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                              {task.name}
                            </CardTitle>
                            <div className="flex items-center gap-3 flex-wrap">
                              {getPriorityBadge(task)}
                              {task.labels?.map((label, index) => (
                                <Badge
                                  key={label.id || index}
                                  variant="outline"
                                  className="text-xs px-2 py-1 rounded-full border-2"
                                  style={{ 
                                    borderColor: label.color + "40", 
                                    backgroundColor: label.color + "10",
                                    color: label.color 
                                  }}
                                >
                                  <Tag className="w-3 h-3 mr-1" />
                                  {label.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>

                    {/* Description Card */}
                    <Card className="border-0 shadow-lg">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          Description
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="prose prose-sm max-w-none">
                          <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {task.description || "No description provided."}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Additional Information Card */}
                    <Card className="border-0 shadow-lg">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                          <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                          Additional Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                              Requirements
                            </h4>
                            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                              <li className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                Task should meet all specified requirements
                              </li>
                              <li className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                Code should be properly tested and reviewed
                              </li>
                              <li className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                Documentation should be updated accordingly
                              </li>
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <>
                    {/* Edit Mode Form */}
                    <div className="space-y-6">
                      <Card className="border-0 shadow-lg">
                        <CardHeader>
                          <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <Edit className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            Task Details
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">
                              Title *
                            </label>
                            <Input
                              value={editedTask?.name || ""}
                              onChange={(e) =>
                                handleTaskFieldChange("name", e.target.value)
                              }
                              placeholder="Enter task title..."
                              className="w-full"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">
                                Status
                              </label>
                              <Select
                                value={editedTask?.status || task.status}
                                onValueChange={(value) =>
                                  handleTaskFieldChange("status", value)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="in-progress">In Progress</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="blocked">Blocked</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">
                                Assigned To
                              </label>
                              <Input
                                value={editedTask?.assignedTo || ""}
                                onChange={(e) =>
                                  handleTaskFieldChange(
                                    "assignedTo",
                                    e.target.value
                                  )
                                }
                                placeholder="Search users..."
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">
                              Due Date
                            </label>
                            <Input
                              type="date"
                              value={
                                editedTask?.dueDate
                                  ? format(editedTask.dueDate, "yyyy-MM-dd")
                                  : ""
                              }
                              onChange={(e) =>
                                handleTaskFieldChange(
                                  "dueDate",
                                  e.target.value
                                    ? new Date(e.target.value)
                                    : null
                                )
                              }
                            />
                          </div>

                          <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">
                              Labels
                            </label>
                            <Input
                              value={
                                editedTask?.labels
                                  ?.map((l) =>
                                    typeof l === "string" ? l : l.name
                                  )
                                  .join("; ") || ""
                              }
                              onChange={(e) => {
                                const labelStrings = e.target.value
                                  .split(";")
                                  .map((l) => l.trim())
                                  .filter(Boolean)
                                const labelObjects = labelStrings.map(
                                  (name) => ({
                                    id: Date.now() + Math.random(),
                                    name,
                                  })
                                )
                                handleTaskFieldChange("labels", labelObjects)
                              }}
                              placeholder="Enter labels separated by semicolons..."
                            />
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-0 shadow-lg">
                        <CardHeader>
                          <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            Description
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Textarea
                            value={editedTask?.description || ""}
                            onChange={(e) =>
                              handleTaskFieldChange("description", e.target.value)
                            }
                            placeholder="Enter task description..."
                            rows={8}
                            className="w-full resize-none"
                          />
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}
              </div>

              {/* Enhanced Right Panel - Metadata */}
              <div className="w-80 border-l bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 overflow-auto">
                <div className="p-6 space-y-6">
                  {/* Task Information Card */}
                  <Card className="border-0 shadow-lg">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Task Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            Status
                          </span>
                          <div className="text-right">
                            {getStatusBadge(task.status)}
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            Assigned To
                          </span>
                          <div className="text-right">
                            {task.assignedTo ? (
                              <div className="flex items-center gap-2">
                                <Avatar className="w-6 h-6">
                                  <AvatarFallback className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                    {task.assignedTo
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                                  {task.assignedTo}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                Unassigned
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            Created
                          </span>
                          <span className="text-xs text-slate-700 dark:text-slate-300">
                            {task.createdAt
                              ? format(task.createdAt, "MMM dd, yyyy")
                              : "Unknown"}
                          </span>
                        </div>

                        {task.dueDate && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                              Due Date
                            </span>
                            <div className="text-right">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-500" />
                                <span className="text-xs text-slate-700 dark:text-slate-300">
                                  {format(task.dueDate, "MMM dd, yyyy")}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            Priority
                          </span>
                          <span className="text-xs text-slate-700 dark:text-slate-300">
                            {task.dueDate ? "High" : "Medium"}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Actions Card */}
                  {mode === "view" && (
                    <Card className="border-0 shadow-lg">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-2">
                          <Play className="w-4 h-4" />
                          Quick Actions
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {onStatusChange && task.status !== "completed" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onStatusChange(task.id, "completed")}
                              className="w-full justify-start gap-2 h-9 text-sm text-green-700 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Mark Complete
                            </Button>
                          )}
                          {onStatusChange && task.status === "pending" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                onStatusChange(task.id, "in-progress")
                              }
                              className="w-full justify-start gap-2 h-9 text-sm text-blue-700 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950"
                            >
                              <Play className="w-4 h-4" />
                              Start Work
                            </Button>
                          )}
                          {onStatusChange && task.status === "in-progress" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                onStatusChange(task.id, "blocked")
                              }
                              className="w-full justify-start gap-2 h-9 text-sm text-red-700 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950"
                            >
                              <AlertCircle className="w-4 h-4" />
                              Mark Blocked
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Enhanced Activity Tab Content */
            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-4xl space-y-6">
                {/* Activity Timeline */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      Activity Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {comments.map((comment, index) => (
                        <div key={comment.id} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <Avatar className="w-10 h-10 flex-shrink-0 shadow-lg">
                              <AvatarFallback className="text-sm bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 dark:from-blue-900 dark:to-purple-900 dark:text-blue-300">
                                {comment.author
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {index < comments.length - 1 && (
                              <div className="w-0.5 h-8 bg-slate-200 dark:bg-slate-700 mt-2"></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-3">
                              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                {comment.author}
                              </span>
                              <span className="text-sm text-slate-500 dark:text-slate-400">
                                {format(
                                  comment.timestamp,
                                  "MMM dd, yyyy 'at' HH:mm"
                                )}
                              </span>
                              {comment.type === "system" && (
                                <Badge
                                  variant="outline"
                                  className="text-xs h-5 px-2 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"
                                >
                                  System
                                </Badge>
                              )}
                            </div>
                            <Card
                              className={cn(
                                "shadow-sm",
                                comment.type === "system"
                                  ? "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800"
                                  : "bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700"
                              )}
                            >
                              <CardContent className="p-4">
                                <p className={cn(
                                  "text-sm leading-relaxed",
                                  comment.type === "system"
                                    ? "text-blue-800 dark:text-blue-200"
                                    : "text-slate-700 dark:text-slate-300"
                                )}>
                                  {comment.content}
                                </p>
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Add Comment Card */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      Add Comment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4">
                      <Avatar className="w-10 h-10 flex-shrink-0 shadow-lg">
                        <AvatarFallback className="text-sm bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 dark:from-blue-900 dark:to-purple-900 dark:text-blue-300">
                          CU
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-4">
                        <Textarea
                          placeholder="Add a comment..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          className="min-h-[120px] resize-none"
                        />
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            onClick={handleAddComment}
                            disabled={!newComment.trim()}
                            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
                          >
                            Add Comment
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
