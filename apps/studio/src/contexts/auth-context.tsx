import { createContext, useContext, useReducer, useCallback, useEffect, ReactNode, useState } from "react"
import {
  AuthState,
  AuthActions,
  LoginCredentials,
  RegisterCredentials,
  AuthUser,
  AuthToken
} from "@/services/contracts/IAuthService"
import { IAuthService } from "@/services/contracts/IAuthService"
import { AuthStorage } from "@/services/contracts/IAuthService"
import { CloudAuthService, LocalAuthService } from "@/services/implementations/AuthService"
import { LocalAuthStorage, ElectronAuthStorage } from "@/services/auth/AuthStorage"
import { isElectron } from "@/lib/constants"

// Auth action types
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: AuthUser; token: AuthToken } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'AUTH_CLEAR' }
  | { type: 'AUTH_CLEAR_ERROR' }
  | { type: 'AUTH_INITIALIZED' }
  | { type: 'AUTH_TOKEN_REFRESHED'; payload: AuthToken }

// Initial state
const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  error: null,
  isInitialized: false,
}

// Auth reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      }
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isLoading: false,
        error: null,
      }
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isLoading: false,
        error: action.payload,
      }
    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isLoading: false,
        error: null,
      }
    case 'AUTH_CLEAR':
      return {
        ...state,
        user: null,
        token: null,
        isLoading: false,
        error: null,
      }
    case 'AUTH_CLEAR_ERROR':
      return {
        ...state,
        error: null,
      }
    case 'AUTH_INITIALIZED':
      return {
        ...state,
        isInitialized: true,
        isLoading: false,
      }
    case 'AUTH_TOKEN_REFRESHED':
      return {
        ...state,
        token: action.payload,
        error: null,
      }
    default:
      return state
  }
}

// Auth context
interface AuthContextType extends AuthState, AuthActions {
  switchAuthMode: (useLocal: boolean) => Promise<void>
  isLocalMode: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Auth provider props
interface AuthProviderProps {
  children: ReactNode
  authService: IAuthService
  storage: AuthStorage
  autoRefreshThreshold?: number // minutes before expiry to refresh
}

export function AuthProvider({ 
  children, 
  authService, 
  storage, 
  autoRefreshThreshold = 5 
}: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState)
  const [currentAuthService, setCurrentAuthService] = useState(authService)
  const [isLocalMode, setIsLocalMode] = useState(true) // Default to local mode for Electron

  // Initialize authentication
  const initialize = useCallback(async () => {
    try {
      dispatch({ type: 'AUTH_START' })
      
      const token = await storage.getToken()
      if (!token) {
        dispatch({ type: 'AUTH_INITIALIZED' })
        return
      }

      // Validate token
      const isValid = await currentAuthService.validateToken()
      if (!isValid) {
        await storage.clearToken()
        dispatch({ type: 'AUTH_INITIALIZED' })
        return
      }

      // Get user information
      const user = await currentAuthService.getCurrentUser()
      
      dispatch({ 
        type: 'AUTH_SUCCESS', 
        payload: { user, token } 
      })
    } catch (error) {
      console.error("Auth initialization failed:", error)
      await storage.clearToken()
      dispatch({ type: 'AUTH_FAILURE', payload: "Failed to initialize authentication" })
    } finally {
      dispatch({ type: 'AUTH_INITIALIZED' })
    }
  }, [currentAuthService, storage])

  // Login
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      dispatch({ type: 'AUTH_START' })
      
      const token = await currentAuthService.login(credentials)
      await storage.setToken(token)
      
      if (token.refreshToken) {
        await storage.setRefreshToken(token.refreshToken)
      }

      const user = await currentAuthService.getCurrentUser()
      
      dispatch({ 
        type: 'AUTH_SUCCESS', 
        payload: { user, token } 
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Login failed"
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage })
      throw error
    }
  }, [currentAuthService, storage])

  // Register
  const register = useCallback(async (credentials: RegisterCredentials) => {
    try {
      dispatch({ type: 'AUTH_START' })
      
      const token = await currentAuthService.register(credentials)
      await storage.setToken(token)
      
      if (token.refreshToken) {
        await storage.setRefreshToken(token.refreshToken)
      }

      const user = await currentAuthService.getCurrentUser()
      
      dispatch({ 
        type: 'AUTH_SUCCESS', 
        payload: { user, token } 
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Registration failed"
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage })
      throw error
    }
  }, [currentAuthService, storage])

  // Social login
  const socialLogin = useCallback(async () => {
    try {
      dispatch({ type: 'AUTH_START' })
      
      const token = await currentAuthService.socialLogin()
      await storage.setToken(token)
      
      if (token.refreshToken) {
        await storage.setRefreshToken(token.refreshToken)
      }

      const user = await currentAuthService.getCurrentUser()
      
      dispatch({ 
        type: 'AUTH_SUCCESS', 
        payload: { user, token } 
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Social login failed"
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage })
      throw error
    }
  }, [currentAuthService, storage])

  // Logout
  const logout = useCallback(async () => {
    try {
      if (state.token) {
        await currentAuthService.logout()
      }
    } catch (error) {
      console.error("Logout request failed:", error)
    } finally {
      await storage.clearToken()
      await storage.clearRefreshToken()
      dispatch({ type: 'AUTH_LOGOUT' })
    }
  }, [currentAuthService, storage, state.token])

  // Refresh token
  const refreshToken = useCallback(async () => {
    try {
      const refreshTokenValue = await storage.getRefreshToken()
      if (!refreshTokenValue) {
        throw new Error("No refresh token available")
      }

      const newToken = await currentAuthService.refreshToken()
      await storage.setToken(newToken)
      
      if (newToken.refreshToken) {
        await storage.setRefreshToken(newToken.refreshToken)
      }

      dispatch({ type: 'AUTH_TOKEN_REFRESHED', payload: newToken })
      
      // Update user info if needed
      if (state.user) {
        const user = await currentAuthService.getCurrentUser()
        dispatch({ 
          type: 'AUTH_SUCCESS', 
          payload: { user, token: newToken } 
        })
      }
    } catch (error) {
      console.error("Token refresh failed:", error)
      await logout()
      throw error
    }
  }, [currentAuthService, storage, state.user, logout])

  // Clear tokens
  const clearTokens = useCallback(async () => {
    await storage.clearToken()
    await storage.clearRefreshToken()
    dispatch({ type: 'AUTH_LOGOUT' })
  }, [storage])

  // Update profile
  const updateProfile = useCallback(async (updates: Partial<AuthUser>) => {
    if (!state.token) {
      throw new Error("Not authenticated")
    }

    try {
      const user = await currentAuthService.updateProfile(state.token.accessToken, updates)
      dispatch({ 
        type: 'AUTH_SUCCESS', 
        payload: { user, token: state.token } 
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update profile"
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage })
      throw error
    }
  }, [currentAuthService, state.token])

  // Change password
  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!state.token) {
      throw new Error("Not authenticated")
    }

    try {
      await currentAuthService.changePassword(state.token.accessToken, currentPassword, newPassword)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to change password"
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage })
      throw error
    }
  }, [currentAuthService, state.token])

  // Authorization helpers
  const hasPermission = useCallback((permission: string): boolean => {
    return state.user?.permissions.includes(permission) || false
  }, [state.user])

  const hasRole = useCallback((role: string): boolean => {
    return state.user?.role === role || false
  }, [state.user])

  const hasAnyRole = useCallback((roles: string[]): boolean => {
    return roles.includes(state.user?.role || "") || false
  }, [state.user])

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: 'AUTH_CLEAR_ERROR' })
  }, [])

  // Auto-refresh token
  useEffect(() => {
    if (!state.token || !state.user) return

    const checkTokenExpiry = () => {
      const timeUntilExpiry = state.token!.expiresAt - Date.now()
      const refreshThreshold = autoRefreshThreshold * 60 * 1000 // Convert to milliseconds

      if (timeUntilExpiry <= refreshThreshold) {
        refreshToken().catch(console.error)
      }
    }

    // Check immediately
    checkTokenExpiry()

    // Set up interval to check every minute
    const interval = setInterval(checkTokenExpiry, 60 * 1000)

    return () => clearInterval(interval)
  }, [state.token, state.user, refreshToken, autoRefreshThreshold])

  // Switch authentication mode (local vs cloud)
  const switchAuthMode = useCallback(async (useLocal: boolean) => {
    try {
      // Clear current authentication state
      await storage.clearToken()
      await storage.clearRefreshToken()
      dispatch({ type: 'AUTH_CLEAR' })
      
      // Create new auth service based on mode
      const newAuthService = useLocal
        ? new LocalAuthService(storage)
        : new CloudAuthService({
            apiBaseUrl: "http://127.0.0.1:8000/api/v1",
            clientId: undefined,
            clientSecret: undefined,
            redirectUri: undefined,
            tokenStorageKey: "auth_token",
            refreshTokenStorageKey: "refresh_token",
            autoRefreshThreshold: 5,
          })
      
      setCurrentAuthService(newAuthService)
      setIsLocalMode(useLocal)
      
      // Re-initialize with new service
      await initialize()
    } catch (error) {
      console.error("Failed to switch auth mode:", error)
    }
  }, [storage, initialize])

  // Initialize on mount
  useEffect(() => {
    initialize()
  }, [initialize])

  const contextValue: AuthContextType = {
    ...state,
    initialize,
    login,
    register,
    socialLogin,
    logout,
    refreshToken,
    clearTokens,
    updateProfile,
    changePassword,
    hasPermission,
    hasRole,
    hasAnyRole,
    clearError,
    switchAuthMode,
    isLocalMode,
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// Hook to create auth service and storage
export function createAuthService(config: {
  apiBaseUrl: string
  clientId?: string
  clientSecret?: string
  redirectUri?: string
  useLocalAuth?: boolean
}) {
  const storage = isElectron()
    ? new ElectronAuthStorage()
    : new LocalAuthStorage()

  const authService = config.useLocalAuth
    ? new LocalAuthService(storage)
    : new CloudAuthService({
        apiBaseUrl: config.apiBaseUrl,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        redirectUri: config.redirectUri,
        tokenStorageKey: "auth_token",
        refreshTokenStorageKey: "refresh_token",
        autoRefreshThreshold: 5,
      })

  return { authService, storage }
}

export default AuthProvider
