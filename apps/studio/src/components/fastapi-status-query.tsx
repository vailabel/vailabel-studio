/**
 * FastAPI Status Component with React Query
 * Shows the status of the FastAPI backend connection using React Query
 */

import React from "react"
import { useServerStatus } from "../hooks/useFastAPIQuery"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { AlertCircle, CheckCircle, RefreshCw, Server } from "lucide-react"
import { Alert, AlertDescription } from "./ui/alert"
import { useQueryClient } from "react-query"

export function FastAPIStatusQuery() {
  const queryClient = useQueryClient()
  const { data: isServerRunning, isLoading, error, refetch } = useServerStatus()

  const getStatusBadge = () => {
    if (isLoading) {
      return <Badge variant="secondary">Checking...</Badge>
    }

    if (isServerRunning) {
      return (
        <Badge variant="default" className="bg-green-500">
          Connected
        </Badge>
      )
    }

    if (error) {
      return <Badge variant="destructive">Error</Badge>
    }

    return <Badge variant="secondary">Disconnected</Badge>
  }

  const getStatusIcon = () => {
    if (isLoading) {
      return <RefreshCw className="h-4 w-4 animate-spin" />
    }

    if (isServerRunning) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }

    return <AlertCircle className="h-4 w-4 text-red-500" />
  }

  const handleRefresh = () => {
    refetch()
  }

  const handleClearCache = () => {
    queryClient.clear()
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <Server className="h-4 w-4" />
          <CardTitle className="text-sm font-medium">FastAPI Backend</CardTitle>
        </div>
        {getStatusBadge()}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className="text-sm text-muted-foreground">
            {isLoading
              ? "Checking connection..."
              : isServerRunning
                ? "Backend is running and ready"
                : "Backend is not available"}
          </span>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error instanceof Error ? error.message : "Connection failed"}
            </AlertDescription>
          </Alert>
        )}

        {!isServerRunning && !isLoading && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Make sure the FastAPI backend is running:
            </p>
            <div className="bg-muted p-3 rounded-md">
              <code className="text-xs">
                cd apps/api
                <br />
                uvicorn main:app --host 0.0.0.0 --port 8000
              </code>
            </div>
          </div>
        )}

        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-3 w-3 mr-1 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>

          <Button variant="outline" size="sm" onClick={handleClearCache}>
            Clear Cache
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <p>
            Base URL:{" "}
            {isServerRunning ? "http://localhost:8000" : "Not available"}
          </p>
          <p>
            Environment:{" "}
            {typeof window !== "undefined" &&
            (window as any).process?.versions?.electron
              ? "Electron"
              : "Web"}
          </p>
          <p>React Query: Enabled with caching</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default FastAPIStatusQuery
