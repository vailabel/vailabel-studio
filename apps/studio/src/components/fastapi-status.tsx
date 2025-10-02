/**
 * FastAPI Status Component
 * Shows the status of the FastAPI backend connection
 */

import React from "react"
import { useFastAPI } from "../hooks/useFastAPI"
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

export function FastAPIStatus() {
  const {
    isInitialized,
    isLoading,
    error,
    isServerRunning,
    retry,
    checkServerStatus,
  } = useFastAPI()

  const getStatusBadge = () => {
    if (isLoading) {
      return <Badge variant="secondary">Checking...</Badge>
    }

    if (isServerRunning && isInitialized) {
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

    if (isServerRunning && isInitialized) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }

    return <AlertCircle className="h-4 w-4 text-red-500" />
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
              : isServerRunning && isInitialized
                ? "Backend is running and ready"
                : "Backend is not available"}
          </span>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error instanceof Error ? error.message : String(error)}
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
            onClick={checkServerStatus}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-3 w-3 mr-1 ${isLoading ? "animate-spin" : ""}`}
            />
            Check Status
          </Button>

          {error && (
            <Button
              variant="default"
              size="sm"
              onClick={retry}
              disabled={isLoading}
            >
              Retry
            </Button>
          )}
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
        </div>
      </CardContent>
    </Card>
  )
}

export default FastAPIStatus
