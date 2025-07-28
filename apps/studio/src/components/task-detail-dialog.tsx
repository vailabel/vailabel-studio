import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Task } from "@vailabel/core"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
  Archive,
  Save,
  X,
  MessageSquare,
  FileText,
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
        className="max-w-7xl max-h-[95vh] overflow-hidden flex flex-col p-0"
        hideCloseButton={true}
      >
        {/* Azure DevOps Style Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                {task.id.slice(-4)}
              </div>
              <div className="flex flex-col">
                <DialogTitle className="text-lg font-medium text-slate-800 dark:text-slate-200">
                  {mode === "edit" ? "Edit Work Item" : task.name}
                </DialogTitle>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Work Item {task.id}
                </span>
              </div>
            </div>
            {getStatusBadge(task.status)}
          </div>
          <div className="flex items-center gap-2">
            {mode === "edit" && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveTask}
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                  disabled={!editedTask}
                >
                  <Save className="w-4 h-4" />
                  Save & Close
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Azure DevOps Style Tabs */}
        <div className="border-b">
          <div className="flex px-6">
            <button
              onClick={() => setActiveTab("details")}
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === "details"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              )}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Details
              </div>
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === "activity"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              )}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Activity
                <Badge variant="secondary" className="text-xs h-5 px-1.5">
                  {comments.filter((c) => c.type === "comment").length}
                </Badge>
              </div>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {activeTab === "details" ? (
            /* Details Tab Content */
            <div className="flex-1 flex overflow-hidden">
              {/* Left Panel - Main Content */}
              <div className="flex-1 overflow-auto p-6 space-y-6">
                {mode === "view" ? (
                  <>
                    {/* Title and Priority */}
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                            {task.name}
                          </h1>
                          <div className="flex items-center gap-3 mt-2">
                            {getPriorityBadge(task)}
                            {task.labels?.map((label, index) => (
                              <Badge
                                key={label.id || index}
                                variant="outline"
                                className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300"
                              >
                                {label.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setMode("edit")
                            if (task) {
                              setEditedTask({ ...task })
                            }
                          }}
                          className="gap-2"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </Button>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                        Description
                      </h3>
                      <div className="border rounded-lg p-4">
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {task.description || "No description provided."}
                        </p>
                      </div>
                    </div>

                    {/* Acceptance Criteria / Additional Details */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                        Acceptance Criteria
                      </h3>
                      <div className="border rounded-lg p-4">
                        <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                          <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0"></span>
                            Task should meet all specified requirements
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0"></span>
                            Code should be properly tested and reviewed
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0"></span>
                            Documentation should be updated accordingly
                          </li>
                        </ul>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Edit Mode Form */}
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                          Work Item Details
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">
                              Title *
                            </label>
                            <Input
                              value={editedTask?.name || ""}
                              onChange={(e) =>
                                handleTaskFieldChange("name", e.target.value)
                              }
                              placeholder="Enter work item title..."
                              className="w-full"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">
                                State
                              </label>
                              <Select
                                value={editedTask?.status || task.status}
                                onValueChange={(value) =>
                                  handleTaskFieldChange("status", value)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select state" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="todo">New</SelectItem>
                                  <SelectItem value="in-progress">
                                    Active
                                  </SelectItem>
                                  <SelectItem value="done">Closed</SelectItem>
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
                              Tags
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
                              placeholder="Enter tags separated by semicolons..."
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                          Description
                        </h3>
                        <Textarea
                          value={editedTask?.description || ""}
                          onChange={(e) =>
                            handleTaskFieldChange("description", e.target.value)
                          }
                          placeholder="Enter work item description..."
                          rows={8}
                          className="w-full resize-none"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Right Panel - Metadata */}
              <div className="w-80 border-l bg-slate-50/50 dark:bg-slate-900/20 overflow-auto">
                <div className="p-4 space-y-6">
                  {/* Work Item Details */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                      Details
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          Assigned To
                        </span>
                        <div className="text-right">
                          {task.assignedTo ? (
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
                              <span className="text-xs text-slate-700 dark:text-slate-300">
                                {task.assignedTo}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500">
                              Unassigned
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          State
                        </span>
                        <div className="text-right">
                          {getStatusBadge(task.status)}
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          Created Date
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
                          <span className="text-xs text-slate-700 dark:text-slate-300">
                            {format(task.dueDate, "MMM dd, yyyy")}
                          </span>
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
                  </div>

                  {/* Quick Actions */}
                  {mode === "view" && (
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                        Actions
                      </h3>
                      <div className="space-y-2">
                        {onStatusChange && task.status !== "completed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onStatusChange(task.id, "completed")}
                            className="w-full justify-start gap-2 h-8 text-xs text-green-700 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950"
                          >
                            <Archive className="w-3 h-3" />
                            Complete
                          </Button>
                        )}
                        {onStatusChange && task.status === "pending" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              onStatusChange(task.id, "in-progress")
                            }
                            className="w-full justify-start gap-2 h-8 text-xs text-blue-700 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950"
                          >
                            <Clock className="w-3 h-3" />
                            Start Work
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Activity Tab Content */
            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-4xl space-y-6">
                {/* Activity Timeline */}
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="w-8 h-8 flex-shrink-0 mt-1">
                        <AvatarFallback className="text-sm bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          {comment.author
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {comment.author}
                          </span>
                          <span className="text-sm text-slate-500">
                            {format(
                              comment.timestamp,
                              "MMM dd, yyyy 'at' HH:mm"
                            )}
                          </span>
                          {comment.type === "system" && (
                            <Badge
                              variant="outline"
                              className="text-xs h-5 px-2"
                            >
                              System
                            </Badge>
                          )}
                        </div>
                        <div
                          className={cn(
                            "text-sm p-3 rounded-lg border",
                            comment.type === "system"
                              ? "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800"
                              : "bg-white text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                          )}
                        >
                          {comment.content}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Comment */}
                <div className="pt-6 border-t">
                  <div className="flex gap-3">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className="text-sm bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        CU
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-3">
                      <Textarea
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="min-h-[100px] resize-none"
                      />
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={handleAddComment}
                          disabled={!newComment.trim()}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700"
                        >
                          Add Comment
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
