import React from "react"
import { 
  Users, 
  Folder, 
  Tag, 
  CheckSquare, 
  Clock, 
  RefreshCw,
  AlertCircle,
  FolderPlus,
  BarChart3,
  LucideIcon
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useOverviewViewModel } from "@/viewmodels/overview-viewmodel"
import { 
  StatCard, 
  QuickActionCard, 
  ActivityItem, 
  ActivitySkeleton 
} from "@/components/overview/overview-components"
import { AuthStatusDemo } from "@/components/auth/AuthStatusDemo"
import { isDevMode, isElectron } from "@/lib/constants"

const Overview: React.FC = () => {
  const {
    statistics,
    recentActivity,
    quickActions,
    isLoading,
    error,
    lastUpdated,
    refreshData,
    isEmpty,
  } = useOverviewViewModel()

  // Icon mapping for quick actions
  const iconMap: Record<string, LucideIcon> = {
    FolderPlus,
    Tag,
    Users,
    CheckSquare,
  }

  const statCards = [
    {
      title: "Total Projects",
      value: statistics.totalProjects,
      icon: Folder,
      color: "bg-blue-500",
      trend: { value: 12, isPositive: true },
    },
    {
      title: "Active Users",
      value: statistics.activeUsers,
      icon: Users,
      color: "bg-green-500",
      trend: { value: 8, isPositive: true },
    },
    {
      title: "Labels Created",
      value: statistics.labelsCreated,
      icon: Tag,
      color: "bg-purple-500",
      trend: { value: 15, isPositive: true },
    },
    {
      title: "Annotations",
      value: statistics.totalAnnotations,
      icon: CheckSquare,
      color: "bg-orange-500",
      trend: { value: 23, isPositive: true },
    },
    {
      title: "Completed Tasks",
      value: statistics.completedTasks,
      icon: CheckSquare,
      color: "bg-emerald-500",
      trend: { value: 5, isPositive: true },
    },
    {
      title: "Pending Tasks",
      value: statistics.pendingTasks,
      icon: Clock,
      color: "bg-amber-500",
      trend: { value: -2, isPositive: false },
    },
  ]

  if (error) {
    return (
      <div className="p-6 min-h-screen">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-4"
              onClick={refreshData}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-6 font-sans min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Welcome to your labeling workspace
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <Badge variant="outline" className="text-xs">
              <RefreshCw className="h-3 w-3 mr-1" />
              Updated {lastUpdated.toLocaleTimeString()}
            </Badge>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Grid */}
      <section className="mb-12">
        <div className="flex items-center gap-4 mb-6">
          <BarChart3 className="h-6 w-6 text-muted-foreground" />
          <h2 className="text-2xl font-semibold">Statistics</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {statCards.map((stat) => (
            <StatCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
              isLoading={isLoading}
              trend={stat.trend}
            />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <section className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ActivitySkeleton count={5} />
              ) : recentActivity.length > 0 ? (
                <div className="space-y-2">
                  {recentActivity.map((item) => (
                    <ActivityItem
                      key={item.id}
                      activity={item.activity}
                      user={item.user}
                      date={item.date}
                      type={item.type}
                      projectName={item.projectName}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recent activity</p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Quick Actions */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderPlus className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {quickActions.map((action) => (
                  <QuickActionCard
                    key={action.id}
                    label={action.label}
                    description={action.description}
                    icon={iconMap[action.icon] || FolderPlus}
                    color={action.color}
                    onClick={action.action}
                    disabled={action.disabled}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Authentication Status Demo */}
        <section>
           {
            isElectron() && isDevMode() && (
              <AuthStatusDemo />
            )
           }
        </section>
      </div>

      {/* Empty State */}
      {isEmpty && !isLoading && (
        <div className="text-center py-16">
          <Folder className="h-24 w-24 mx-auto mb-6 text-muted-foreground opacity-50" />
          <h3 className="text-2xl font-semibold mb-4">Welcome to VaiLabeling</h3>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Get started by creating your first project and adding some labels to begin your labeling journey.
          </p>
          <Button onClick={quickActions[0]?.action} size="lg">
            <FolderPlus className="h-5 w-5 mr-2" />
            Create Your First Project
          </Button>
        </div>
      )}
    </div>
  )
}

export default Overview
