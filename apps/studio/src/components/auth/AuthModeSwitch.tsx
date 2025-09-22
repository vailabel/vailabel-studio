import React from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { isElectron } from "@/lib/constants"

interface AuthModeSwitchProps {
  className?: string
}

export function AuthModeSwitch({ className }: AuthModeSwitchProps) {
  const { isLocalMode, switchAuthMode, isLoading } = useAuth()

  const handleModeChange = async (checked: boolean) => {
    try {
      await switchAuthMode(checked)
    } catch (error) {
      console.error("Failed to switch auth mode:", error)
    }
  }

  // Only show in Electron
  if (!isElectron()) {
    return null
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="auth-mode-switch" className="text-sm font-medium">
              Authentication Mode
            </Label>
            <p className="text-xs text-muted-foreground">
              {isLocalMode 
                ? "Using local database authentication" 
                : "Using cloud API authentication"
              }
            </p>
          </div>
          <Switch
            id="auth-mode-switch"
            checked={isLocalMode}
            onCheckedChange={handleModeChange}
            disabled={isLoading}
          />
        </div>
      </CardContent>
    </Card>
  )
}
