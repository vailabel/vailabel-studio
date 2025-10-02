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
  LucideIcon,
  Image,
  Target,
  TrendingUp,
  Activity,
  Zap,
  FileText,
  Database,
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
  ActivitySkeleton,
} from "@/components/overview/overview-components"

const Overview: React.FC = () => {
  const {
    stats: statistics,
    recentProjects: recentActivity,
    quickActions,
    isLoading,
    error,
    isEmpty,
    lastUpdated,
    refreshData,
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
      title: "Active Projects",
      value: statistics.totalProjects,
      icon: Folder,
      color: "bg-primary",
      trend: { value: 12, isPositive: true },
    },
    {
      title: "Images Labeled",
      value: statistics.totalAnnotations,
      icon: Image,
      color: "bg-green-600",
      trend: { value: 23, isPositive: true },
    },
    {
      title: "Label Classes",
      value: statistics.labelsCreated,
      icon: Tag,
      color: "bg-purple-600",
      trend: { value: 15, isPositive: true },
    },
    {
      title: "Annotation Accuracy",
      value: "94.2%",
      icon: Target,
      color: "bg-orange-600",
      trend: { value: 2.1, isPositive: true },
    },
    {
      title: "Labeling Speed",
      value: "12.5/min",
      icon: Zap,
      color: "bg-emerald-600",
      trend: { value: 8.3, isPositive: true },
    },
    {
      title: "Pending Reviews",
      value: statistics.pendingTasks,
      icon: Clock,
      color: "bg-amber-600",
      trend: { value: -2, isPositive: false },
    },
  ]

  if (error) {
    return (
      <div className="p-6 min-h-screen">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error instanceof Error ? error.message : String(error)}
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
          <h1 className="text-4xl font-extrabold text-foreground">Dashboard</h1>
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
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Grid */}
      <section className="mb-12">
        <div className="flex items-center gap-4 mb-6">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-semibold text-foreground">Statistics</h2>
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Recent Annotations */}
        <section className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Activity className="h-5 w-5 text-primary" />
                Recent Annotations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ActivitySkeleton count={5} />
              ) : recentActivity.length > 0 ? (
                <div className="space-y-2">
                  {recentActivity.map((project) => (
                    <ActivityItem
                      key={project.id}
                      activity={`Updated project "${project.name}"`}
                      user="System"
                      date={
                        new Date(
                          project.updatedAt || project.createdAt || new Date()
                        )
                      }
                      type="project"
                      projectName={project.name}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recent annotations</p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Label Distribution */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <BarChart3 className="h-5 w-5 text-primary" />
                Label Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary"></div>
                    <span className="text-sm text-foreground">Person</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    45%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-600"></div>
                    <span className="text-sm text-foreground">Vehicle</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    32%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-600"></div>
                    <span className="text-sm text-foreground">Building</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    18%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-600"></div>
                    <span className="text-sm text-foreground">Other</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    5%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Quick Actions */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Zap className="h-5 w-5 text-primary" />
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
      </div>

      {/* Workflow Insights */}
      <section className="mt-8">
        <div className="flex items-center gap-4 mb-6">
          <TrendingUp className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-semibold text-foreground">
            Workflow Insights
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                <FileText className="h-5 w-5 text-primary" />
                Quality Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground mb-2">
                8.7/10
              </div>
              <p className="text-sm text-muted-foreground">
                Based on annotation consistency and accuracy
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                <Database className="h-5 w-5 text-primary" />
                Dataset Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground mb-2">92%</div>
              <p className="text-sm text-muted-foreground">
                Complete and validated annotations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                <Users className="h-5 w-5 text-primary" />
                Team Productivity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground mb-2">156</div>
              <p className="text-sm text-muted-foreground">
                Annotations completed this week
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Empty State */}
      {isEmpty && !isLoading && (
        <div className="text-center py-16">
          <Folder className="h-24 w-24 mx-auto mb-6 text-muted-foreground opacity-50" />
          <h3 className="text-2xl font-semibold mb-4 text-foreground">
            Welcome to VAI Label Studio
          </h3>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Start your annotation workflow by creating a project, uploading
            images, and defining label classes for your computer vision tasks.
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
