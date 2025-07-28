import React from "react"
import { Badge } from "@/components/ui/badge"
import { Clock, AlertTriangle, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

interface TaskPriorityBadgeProps {
  dueDate?: Date
  size?: "sm" | "md" | "lg"
  showIcon?: boolean
}

const getPriorityLevel = (dueDate?: Date) => {
  if (!dueDate) return "none"

  const today = new Date()
  const timeDiff = dueDate.getTime() - today.getTime()
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24))

  if (daysDiff < 0) return "overdue"
  if (daysDiff <= 1) return "urgent"
  if (daysDiff <= 3) return "high"
  if (daysDiff <= 7) return "medium"
  return "low"
}

const priorityConfig = {
  overdue: {
    label: "Overdue",
    icon: AlertTriangle,
    colors:
      "bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-300 dark:border-red-700",
  },
  urgent: {
    label: "Due Today",
    icon: Zap,
    colors:
      "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900 dark:text-orange-300 dark:border-orange-700",
  },
  high: {
    label: "Due Soon",
    icon: Clock,
    colors:
      "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-700",
  },
  medium: {
    label: "This Week",
    icon: Clock,
    colors:
      "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700",
  },
  low: {
    label: "Future",
    icon: Clock,
    colors:
      "bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-700",
  },
  none: {
    label: "No Due Date",
    icon: Clock,
    colors:
      "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600",
  },
}

export const TaskPriorityBadge: React.FC<TaskPriorityBadgeProps> = ({
  dueDate,
  size = "sm",
  showIcon = true,
}) => {
  const priority = getPriorityLevel(dueDate)
  const config = priorityConfig[priority]
  const Icon = config.icon

  // Don't show priority badge for low priority or no due date
  if (priority === "low" || priority === "none") {
    return null
  }

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-0.5",
    lg: "text-base px-3 py-1",
  }

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  }

  return (
    <Badge
      variant="outline"
      className={cn("border font-medium", config.colors, sizeClasses[size])}
    >
      {showIcon && <Icon className={cn("mr-1", iconSizes[size])} />}
      {config.label}
    </Badge>
  )
}
