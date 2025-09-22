import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  BarChart3,
  Calendar,
  Users,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"

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
    bgColor: "bg-blue-100 dark:bg-blue-900",
    borderColor: "border-blue-200 dark:border-blue-800",
    gradient: "from-blue-500 to-blue-600",
  },
  {
    key: "pending",
    label: "Pending",
    icon: Calendar,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100 dark:bg-yellow-900",
    borderColor: "border-yellow-200 dark:border-yellow-800",
    gradient: "from-yellow-500 to-orange-500",
  },
  {
    key: "inProgress",
    label: "In Progress",
    icon: Users,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900",
    borderColor: "border-blue-200 dark:border-blue-800",
    gradient: "from-blue-500 to-purple-500",
  },
  {
    key: "completed",
    label: "Completed",
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900",
    borderColor: "border-green-200 dark:border-green-800",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    key: "blocked",
    label: "Blocked",
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900",
    borderColor: "border-red-200 dark:border-red-800",
    gradient: "from-red-500 to-rose-500",
  },
] as const

export const TaskStatsCards: React.FC<TaskStatsProps> = ({ stats }) => {
  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {statsConfig.map((config, index) => {
        const Icon = config.icon
        const value = stats[config.key as keyof typeof stats]
        const isTotalCard = config.key === "total"

        return (
          <Card 
            key={config.key} 
            className={cn(
              "border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:scale-105 group",
              config.borderColor
            )}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                {config.label}
              </CardTitle>
              <div className={cn(
                "p-2 rounded-lg transition-all duration-200 group-hover:scale-110",
                config.bgColor
              )}>
                <Icon className={cn("h-4 w-4", config.color)} />
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className={cn("text-3xl font-bold", config.color)}>
                {value}
              </div>
              
              {isTotalCard && stats.total > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Progress
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {completionRate}%
                    </Badge>
                  </div>
                  <Progress 
                    value={completionRate} 
                    className="h-2"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{stats.completed} completed</span>
                    <span>{stats.total - stats.completed} remaining</span>
                  </div>
                </div>
              )}

              {!isTotalCard && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {config.key === "pending" && "Awaiting start"}
                    {config.key === "inProgress" && "Currently active"}
                    {config.key === "completed" && "Finished tasks"}
                    {config.key === "blocked" && "Needs attention"}
                  </span>
                  {value > 0 && (
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", config.color)}
                    >
                      Active
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
