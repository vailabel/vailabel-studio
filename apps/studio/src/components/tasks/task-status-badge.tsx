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
      "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700",
  },
  "in-progress": {
    label: "In Progress",
    icon: Clock4,
    colors: "bg-primary/10 text-primary border-primary/20",
  },
  pending: {
    label: "Pending",
    icon: Circle,
    colors:
      "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-700",
  },
  blocked: {
    label: "Blocked",
    icon: AlertCircle,
    colors: "bg-destructive/10 text-destructive border-destructive/20",
  },
  default: {
    label: "Unknown",
    icon: Clock,
    colors: "bg-muted text-muted-foreground border-border",
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
