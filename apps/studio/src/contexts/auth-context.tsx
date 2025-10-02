/**
 * Authentication Context for MVVM Pattern
 * Provides authentication state management using React Query
 */

import React, { createContext, useContext, ReactNode } from "react"
import { useCurrentUser, useLogin, useLogout } from "../hooks/useFastAPIQuery"
import { User } from "@vailabel/core"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  isInitialized: boolean
  error: Error | null
  isLocalMode: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
  register: (email: string, password: string, name: string) => Promise<User>
  socialLogin: (provider: "github" | "google") => Promise<User>
  updateProfile: (updates: Partial<User>) => Promise<User>
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>
  clearError: () => void
  switchAuthMode: (isLocal: boolean) => Promise<void>
  loginMutation: ReturnType<typeof useLogin>
  logoutMutation: ReturnType<typeof useLogout>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { data: user, isLoading, isError, error } = useCurrentUser()
  const loginMutation = useLogin()
  const logoutMutation = useLogout()

  const isAuthenticated = !!user && !isLoading
  const isInitialized = !isLoading && (!!user || isError)
  const [isLocalMode, setIsLocalMode] = React.useState(true) // Default to local mode for easier testing

  // Auto-login in local mode on mount
  React.useEffect(() => {
    if (isLocalMode && !user && !isLoading) {
      loginMutation.mutate(
        { email: "admin@example.com", password: "admin123" },
        {
          onError: (error) => {
            console.error("Auto-login failed:", error)
          },
        }
      )
    }
  }, [isLocalMode, user, isLoading, loginMutation])

  const login = async (email: string, password: string): Promise<User> => {
    return new Promise((resolve, reject) => {
      loginMutation.mutate(
        { email, password },
        {
          onSuccess: (response) => {
            resolve(response.user)
          },
          onError: (error) => {
            reject(error)
          },
        }
      )
    })
  }

  const logout = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      logoutMutation.mutate(undefined, {
        onSuccess: () => {
          resolve()
        },
        onError: (error) => {
          reject(error)
        },
      })
    })
  }

  const register = async (
    email: string,
    password: string,
    name: string
  ): Promise<User> => {
    // For now, throw an error as registration is not implemented
    console.log("Registration attempt:", { email, password, name })
    throw new Error("Registration not implemented")
  }

  const socialLogin = async (provider: "github" | "google"): Promise<User> => {
    // For now, throw an error as social login is not implemented
    console.log("Social login attempt:", provider)
    throw new Error("Social login not implemented")
  }

  const updateProfile = async (updates: Partial<User>): Promise<User> => {
    // For now, throw an error as profile update is not implemented
    console.log("Profile update attempt:", updates)
    throw new Error("Profile update not implemented")
  }

  const changePassword = async (
    oldPassword: string,
    newPassword: string
  ): Promise<void> => {
    // For now, throw an error as password change is not implemented
    console.log("Password change attempt:", { oldPassword, newPassword })
    throw new Error("Password change not implemented")
  }

  const clearError = () => {
    // For now, do nothing as error handling is managed by React Query
  }

  const switchAuthMode = async (isLocal: boolean) => {
    // Update the state
    setIsLocalMode(isLocal)

    // If switching to local mode, automatically log in as admin
    if (isLocal) {
      try {
        const adminUser = await login("admin@vailabel.local", "admin123")
        console.log("Logged in as admin user:", adminUser)
      } catch (error) {
        console.error("Failed to login as admin user:", error)
        // If login fails, switch back to remote mode
        setIsLocalMode(false)
        throw error
      }
    } else {
      // If switching to remote mode, log out
      try {
        await logout()
      } catch (error) {
        console.error("Failed to logout:", error)
        throw error
      }
    }
  }

  const value: AuthContextType = {
    user: user || null,
    isLoading,
    isAuthenticated,
    isInitialized,
    error: error instanceof Error ? error : null,
    isLocalMode,
    login,
    logout,
    register,
    socialLogin,
    updateProfile,
    changePassword,
    clearError,
    switchAuthMode,
    loginMutation,
    logoutMutation,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
