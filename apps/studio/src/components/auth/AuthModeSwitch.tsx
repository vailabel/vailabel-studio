import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { isElectron } from "@/lib/constants"
import { Database, Cloud, Monitor } from "lucide-react"

interface AuthModeSwitchProps {
  className?: string
}

export function AuthModeSwitch({ className }: AuthModeSwitchProps) {
  const { isLocalMode, switchAuthMode, isLoading } = useAuth()

  const handleLocalMode = async () => {
    try {
      await switchAuthMode(true)
    } catch (error) {
      console.error("Failed to switch to local mode:", error)
    }
  }

  const handleRemoteMode = async () => {
    try {
      await switchAuthMode(false)
    } catch (error) {
      console.error("Failed to switch to remote mode:", error)
    }
  }

  // Only show in Electron
  if (!isElectron()) {
    return null
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-center">
          Choose Authentication Mode
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-3">
          <Button
            variant={isLocalMode ? "default" : "outline"}
            onClick={handleLocalMode}
            disabled={isLoading}
            className="h-auto p-4 flex flex-col items-center space-y-2"
          >
            <Database className="h-6 w-6" />
            <div className="text-center">
              <div className="font-medium">Local Mode</div>
              <div className="text-xs opacity-70">
                Use local database authentication
              </div>
            </div>
          </Button>

          <Button
            variant={!isLocalMode ? "default" : "outline"}
            onClick={handleRemoteMode}
            disabled={isLoading}
            className="h-auto p-4 flex flex-col items-center space-y-2"
          >
            <Cloud className="h-6 w-6" />
            <div className="text-center">
              <div className="font-medium">API Server Mode</div>
              <div className="text-xs opacity-70">
                Use cloud API authentication
              </div>
            </div>
          </Button>
        </div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            {isLocalMode
              ? "Currently using local database authentication"
              : "Currently using cloud API authentication"}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
