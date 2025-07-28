import React from "react"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock4, Circle, AlertCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface TaskStatusBadgeProps {
  status: string
  showIcon?: boolean
  size?: "sm" | "md" | "lg"
}

const statusConfig = {
  completed: {
    label: "Completed",
    icon: CheckCircle,
    colors:
      "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-700",
  },
  "in-progress": {
    label: "In Progress",
    icon: Clock4,
    colors:
      "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700",
  },
  pending: {
    label: "Pending",
    icon: Circle,
    colors:
      "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-700",
  },
  blocked: {
    label: "Blocked",
    icon: AlertCircle,
    colors:
      "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-700",
  },
  default: {
    label: "Unknown",
    icon: Clock,
    colors:
      "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600",
  },
}

export const TaskStatusBadge: React.FC<TaskStatusBadgeProps> = ({
  status,
  showIcon = true,
  size = "md",
}) => {
  const config =
    statusConfig[status as keyof typeof statusConfig] || statusConfig.default
  const Icon = config.icon

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
