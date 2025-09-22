import { Navigate, useLocation } from "react-router-dom"
import { AuthPage } from "@/components/auth/auth-components"
import { useAuth } from "@/contexts/auth-context"

export default function LoginPage() {
  const { user, isLoading, isInitialized } = useAuth()
  const location = useLocation()

  // Show loading while initializing
  if (!isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  // Redirect if already authenticated
  if (user) {
    const from = location.state?.from?.pathname || "/"
    return <Navigate to={from} replace />
  }

  return <AuthPage />
}
