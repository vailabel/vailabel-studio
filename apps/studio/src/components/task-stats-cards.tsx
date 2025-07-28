import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart3,
  Calendar,
  Users,
  AlertTriangle,
  CheckCircle,
} from "lucide-react"

interface TaskStatsProps {
  stats: {
    total: number
    completed: number
    inProgress: number
    pending: number
    blocked: number
  }
}

const statsConfig = [
  {
    key: "total",
    label: "Total Tasks",
    icon: BarChart3,
    color: "text-blue-600",
  },
  {
    key: "pending",
    label: "Pending",
    icon: Calendar,
    color: "text-yellow-600",
  },
  {
    key: "inProgress",
    label: "In Progress",
    icon: Users,
    color: "text-blue-600",
  },
  {
    key: "completed",
    label: "Completed",
    icon: CheckCircle,
    color: "text-green-600",
  },
  {
    key: "blocked",
    label: "Blocked",
    icon: AlertTriangle,
    color: "text-red-600",
  },
] as const

export const TaskStatsCards: React.FC<TaskStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {statsConfig.map((config) => {
        const Icon = config.icon
        const value = stats[config.key as keyof typeof stats]

        return (
          <Card key={config.key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {config.label}
              </CardTitle>
              <Icon
                className={`h-4 w-4 ${config.color.replace("text-", "text-muted-foreground")}`}
              />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${config.color}`}>
                {value}
              </div>
              {config.key === "total" && (
                <p className="text-xs text-muted-foreground">
                  {stats.completed > 0 &&
                    `${Math.round((stats.completed / stats.total) * 100)}% complete`}
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
