import React from "react"
import { motion } from "framer-motion"
import { LucideIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface StatCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  color: string
  isLoading?: boolean
  trend?: {
    value: number
    isPositive: boolean
  }
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  color,
  isLoading = false,
  trend,
}) => {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-lg" />
          <div className="flex-1">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </Card>
    )
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <Card className="p-6 hover:shadow-lg transition-shadow duration-200">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg ${color} text-white`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              {title}
            </h3>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">{value}</p>
              {trend && (
                <span
                  className={`text-sm font-medium ${
                    trend.isPositive ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {trend.isPositive ? "+" : ""}{trend.value}%
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

interface QuickActionCardProps {
  label: string
  description: string
  icon: LucideIcon
  color: string
  onClick: () => void
  disabled?: boolean
}

export const QuickActionCard: React.FC<QuickActionCardProps> = ({
  label,
  description,
  icon: Icon,
  color,
  onClick,
  disabled = false,
}) => {
  return (
    <motion.button
      className={`p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-left w-full ${
        disabled ? "opacity-50 cursor-not-allowed" : "hover:scale-105"
      } ${color}`}
      whileHover={disabled ? {} : { scale: 1.05 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      onClick={onClick}
      disabled={disabled}
    >
      <div className="flex items-center gap-4 text-white">
        <Icon className="w-8 h-8" />
        <div>
          <h3 className="text-lg font-semibold">{label}</h3>
          <p className="text-sm opacity-90">{description}</p>
        </div>
      </div>
    </motion.button>
  )
}

interface ActivityItemProps {
  activity: string
  user: string
  date: Date
  type: "project" | "annotation" | "label" | "user"
  projectName?: string
}

export const ActivityItem: React.FC<ActivityItemProps> = ({
  activity,
  user,
  date,
  type,
  projectName,
}) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "project":
        return "📁"
      case "annotation":
        return "✏️"
      case "label":
        return "🏷️"
      case "user":
        return "👤"
      default:
        return "📝"
    }
  }

  const formatDate = (date: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors"
    >
      <div className="text-2xl">{getTypeIcon(type)}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{activity}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{user}</span>
          {projectName && (
            <>
              <span>•</span>
              <span className="truncate">{projectName}</span>
            </>
          )}
        </div>
      </div>
      <div className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDate(date)}
      </div>
    </motion.div>
  )
}

interface LoadingSkeletonProps {
  count?: number
}

export const ActivitySkeleton: React.FC<LoadingSkeletonProps> = ({ count = 3 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 p-4">
          <Skeleton className="w-8 h-8 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  )
}
