import { useAuth } from "@/contexts/auth-context"
import { useAuthCondition } from "@/guards/auth-guards"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LogOut, User, Shield, Settings } from "lucide-react"

/**
 * Authentication Status Component
 * 
 * This component demonstrates the authentication and authorization system
 * working in the frontend. It shows:
 * - Current user information
 * - User permissions
 * - Role-based access controls
 * - Authentication actions
 */
export function AuthStatusDemo() {
  const { user, isLoading, error, logout } = useAuth()
  const { canAccess } = useAuthCondition()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Authentication Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading authentication...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Shield className="h-5 w-5" />
            Authentication Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
            <p className="font-medium">Error:</p>
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Authentication Status
          </CardTitle>
          <CardDescription>Not authenticated</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-4">Please log in to access the application</p>
            <Button onClick={() => window.location.href = "/login"}>
              Go to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Authentication Status
        </CardTitle>
        <CardDescription>Current user information and permissions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User Information */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
          <User className="h-8 w-8 text-primary" />
          <div className="flex-1">
            <h3 className="font-semibold">{user.name}</h3>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <Badge variant="secondary" className="mt-1 capitalize">
              {user.role}
            </Badge>
          </div>
        </div>

        {/* Permissions */}
        <div>
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Permissions
          </h4>
          <div className="flex flex-wrap gap-1">
            {user.permissions?.map((permission) => (
              <Badge key={permission} variant="outline" className="text-xs">
                {permission}
              </Badge>
            ))}
          </div>
        </div>

        {/* Access Control Examples */}
        <div>
          <h4 className="font-medium mb-2">Access Control Examples</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
              <span>Users Management</span>
              <Badge variant={canAccess(undefined, ["admin", "manager"]) ? "default" : "secondary"}>
                {canAccess(undefined, ["admin", "manager"]) ? "Accessible" : "Restricted"}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
              <span>Project Creation</span>
              <Badge variant={canAccess("projects:write") ? "default" : "secondary"}>
                {canAccess("projects:write") ? "Accessible" : "Restricted"}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
              <span>AI Models</span>
              <Badge variant={canAccess("ai_models:read") ? "default" : "secondary"}>
                {canAccess("ai_models:read") ? "Accessible" : "Restricted"}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
              <span>Settings</span>
              <Badge variant={canAccess("settings:write") ? "default" : "secondary"}>
                {canAccess("settings:write") ? "Accessible" : "Restricted"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t space-y-2">
          <Button 
            variant="outline" 
            onClick={logout}
            className="w-full flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
          
          <Button 
            variant="secondary" 
            onClick={async () => {
              try {
                const result = await window.ipc.invoke("test:auth")
                alert(`IPC Test Result: ${result}`)
              } catch (error) {
                alert(`IPC Test Failed: ${error}`)
              }
            }}
            className="w-full"
          >
            Test IPC Connection
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default AuthStatusDemo
