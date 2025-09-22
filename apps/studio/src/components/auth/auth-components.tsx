import React, { useState } from "react"
import { motion } from "framer-motion"
import { Eye, EyeOff, Mail, Lock, User, Github, Chrome } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/contexts/auth-context"
import { LoginCredentials, RegisterCredentials } from "@/services/contracts/IAuthService"
import { AuthModeSwitch } from "./AuthModeSwitch"

interface LoginFormProps {
  onSuccess?: () => void
  onSwitchToRegister?: () => void
}

interface RegisterFormProps {
  onSuccess?: () => void
  onSwitchToLogin?: () => void
}

interface SocialLoginProps {
  onSuccess?: () => void
}

export function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
  const { login, isLoading, error, clearError, isLocalMode } = useAuth()
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    
    try {
      await login(credentials)
      onSuccess?.()
    } catch {
      // Error is handled by the auth context
    }
  }

  const handleInputChange = (field: keyof LoginCredentials) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCredentials(prev => ({ ...prev, [field]: e.target.value }))
    if (error) clearError()
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Welcome back</CardTitle>
        <CardDescription className="text-center">
          Sign in to your account to continue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={credentials.email}
                onChange={handleInputChange("email")}
                className="pl-10"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={credentials.password}
                onChange={handleInputChange("password")}
                className="pl-10 pr-10"
                required
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        {!isLocalMode && (
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <SocialLogin onSuccess={onSuccess} />
          </div>
        )}

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">Don't have an account? </span>
          <Button
            variant="link"
            className="p-0 h-auto font-normal"
            onClick={onSwitchToRegister}
            disabled={isLoading}
          >
            Sign up
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
  const { register, isLoading, error, clearError } = useAuth()
  const [credentials, setCredentials] = useState<RegisterCredentials>({
    name: "",
    email: "",
    password: "",
    role: "annotator",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    if (credentials.password !== confirmPassword) {
      return
    }
    
    try {
      await register(credentials)
      onSuccess?.()
    } catch {
      // Error is handled by the auth context
    }
  }

  const handleInputChange = (field: keyof RegisterCredentials) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCredentials(prev => ({ ...prev, [field]: e.target.value }))
    if (error) clearError()
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Create account</CardTitle>
        <CardDescription className="text-center">
          Sign up to get started with VaiLabeling
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={credentials.name}
                onChange={handleInputChange("name")}
                className="pl-10"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={credentials.email}
                onChange={handleInputChange("email")}
                className="pl-10"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                value={credentials.password}
                onChange={handleInputChange("password")}
                className="pl-10 pr-10"
                required
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10"
                required
                disabled={isLoading}
              />
            </div>
            {credentials.password && confirmPassword && credentials.password !== confirmPassword && (
              <p className="text-sm text-red-600">Passwords do not match</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading || credentials.password !== confirmPassword}>
            {isLoading ? "Creating account..." : "Create account"}
          </Button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <SocialLogin onSuccess={onSuccess} />
        </div>

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">Already have an account? </span>
          <Button
            variant="link"
            className="p-0 h-auto font-normal"
            onClick={onSwitchToLogin}
            disabled={isLoading}
          >
            Sign in
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function SocialLogin({ onSuccess }: SocialLoginProps) {
  const { socialLogin, isLoading } = useAuth()

  const handleSocialLogin = async (provider: "github" | "google") => {
    try {
      // In a real implementation, this would redirect to the OAuth provider
      // For now, we'll simulate the OAuth flow
      const mockCode = `mock_${provider}_code_${Date.now()}`
      
      await socialLogin({
        provider,
        code: mockCode,
      })
      
      onSuccess?.()
    } catch (error) {
      console.error(`${provider} login failed:`, error)
    }
  }

  return (
    <div className="grid grid-cols-2 gap-4 mt-4">
      <Button
        variant="outline"
        onClick={() => handleSocialLogin("github")}
        disabled={isLoading}
        className="w-full"
      >
        <Github className="mr-2 h-4 w-4" />
        GitHub
      </Button>
      <Button
        variant="outline"
        onClick={() => handleSocialLogin("google")}
        disabled={isLoading}
        className="w-full"
      >
        <Chrome className="mr-2 h-4 w-4" />
        Google
      </Button>
    </div>
  )
}

export function AuthPage() {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login")

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md space-y-4"
      >
        <AuthModeSwitch />
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "login" | "register")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="register">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login" className="mt-6">
            <LoginForm 
              onSwitchToRegister={() => setActiveTab("register")}
            />
          </TabsContent>
          
          <TabsContent value="register" className="mt-6">
            <RegisterForm 
              onSwitchToLogin={() => setActiveTab("login")}
            />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  )
}

export function UserProfile() {
  const { user, logout, updateProfile, changePassword, isLoading } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updateProfile(formData)
      setIsEditing(false)
    } catch {
      // Error is handled by the auth context
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return
    }
    
    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword)
      setIsChangingPassword(false)
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
    } catch {
      // Error is handled by the auth context
    }
  }

  if (!user) return null

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>
          Manage your account settings and preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Profile Information */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Profile Information</h3>
            <Button
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
              disabled={isLoading}
            >
              {isEditing ? "Cancel" : "Edit"}
            </Button>
          </div>

          {isEditing ? (
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                <p className="text-sm">{user.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                <p className="text-sm">{user.email}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Role</Label>
                <p className="text-sm capitalize">{user.role}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Member Since</Label>
                <p className="text-sm">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Unknown"}</p>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Password Change */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Password</h3>
            <Button
              variant="outline"
              onClick={() => setIsChangingPassword(!isChangingPassword)}
              disabled={isLoading}
            >
              {isChangingPassword ? "Cancel" : "Change Password"}
            </Button>
          </div>

          {isChangingPassword ? (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  disabled={isLoading}
                />
                {passwordData.newPassword && passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                  <p className="text-sm text-red-600">Passwords do not match</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={isLoading || passwordData.newPassword !== passwordData.confirmPassword}
                >
                  {isLoading ? "Changing..." : "Change Password"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsChangingPassword(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              Click "Change Password" to update your password
            </p>
          )}
        </div>

        <Separator />

        {/* Logout */}
        <div className="flex justify-end">
          <Button variant="destructive" onClick={logout} disabled={isLoading}>
            {isLoading ? "Signing out..." : "Sign Out"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
