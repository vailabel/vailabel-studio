import React from "react"
import { LucideIcon } from "lucide-react"
import { Card } from "@/shared/ui/card"

interface LabelStatsCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  color: string
  trend?: {
    value: number
    isPositive: boolean
  }
  isLoading?: boolean
}

export const LabelStatsCard: React.FC<LabelStatsCardProps> = ({
  title,
  value,
  icon: Icon,
  color,
  trend,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-muted animate-pulse" />
          <div className="flex-1">
            <div className="h-4 w-24 mb-2 bg-muted rounded animate-pulse" />
            <div className="h-8 w-16 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 bg-card">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${color} text-white`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">
            {title}
          </h3>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {trend && (
              <span
                className={`text-sm font-medium ${
                  trend.isPositive ? "text-success" : "text-destructive"
                }`}
              >
                {trend.isPositive ? "+" : ""}
                {trend.value}%
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
