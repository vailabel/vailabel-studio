import React from "react"
import {
  Folder,
  FolderPlus,
  RefreshCw,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { useOverviewViewModel } from "@/viewmodels/overview-viewmodel"
import {
  StatGrid,
  RecentActivity,
  ProjectStatusBreakdown,
  QuickActionsPanel,
} from "@/components/overview/overview-sections"

const Overview: React.FC = () => {
  const {
    stats,
    recentProjects,
    quickActions,
    statusBreakdown,
    isLoading,
    error,
    isEmpty,
    lastUpdated,
    refreshData,
  } = useOverviewViewModel()

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

      <StatGrid stats={stats} isLoading={isLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <RecentActivity projects={recentProjects} isLoading={isLoading} />
        <ProjectStatusBreakdown
          breakdown={statusBreakdown}
          isLoading={isLoading}
        />
        <QuickActionsPanel actions={quickActions} />
      </div>

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
