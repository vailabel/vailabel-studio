import { User } from "@vailabel/core"

export interface AuthToken {
  accessToken: string
  refreshToken?: string
  expiresAt: number
  tokenType: "Bearer"
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  name: string
  email: string
  password: string
  role?: "admin" | "manager" | "reviewer" | "annotator"
}

export interface SocialLoginProvider {
  provider: "github" | "google"
  code: string
  state?: string
}

export interface AuthUser extends User {
  isAuthenticated: boolean
  lastLoginAt?: Date
  permissions: string[]
}

export interface AuthState {
  user: AuthUser | null
  token: AuthToken | null
  isLoading: boolean
  error: string | null
  isInitialized: boolean
}

export interface AuthActions {
  // Authentication
  login: (credentials: LoginCredentials) => Promise<void>
  register: (credentials: RegisterCredentials) => Promise<void>
  socialLogin: (provider: SocialLoginProvider) => Promise<void>
  logout: () => Promise<void>
  
  // Token management
  refreshToken: () => Promise<void>
  clearTokens: () => void
  
  // User management
  updateProfile: (updates: Partial<User>) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  
  // Authorization
  hasPermission: (permission: string) => boolean
  hasRole: (role: string) => boolean
  hasAnyRole: (roles: string[]) => boolean
  
  // State management
  initialize: () => Promise<void>
  clearError: () => void
}

export interface IAuthService {
  // Authentication
  login(credentials: LoginCredentials): Promise<AuthToken>
  register(credentials: RegisterCredentials): Promise<AuthToken>
  socialLogin(): Promise<AuthToken>
  logout(): Promise<void>
  
  // Token management
  refreshToken(): Promise<AuthToken>
  validateToken(): Promise<boolean>
  
  // User management
  getCurrentUser(): Promise<AuthUser>
  updateProfile(token: string, updates: Partial<User>): Promise<AuthUser>
  changePassword(token: string, currentPassword: string, newPassword: string): Promise<void>
  
  // Authorization
  getUserPermissions(): Promise<string[]>
}

export interface AuthStorage {
  getToken(): Promise<AuthToken | null>
  setToken(token: AuthToken): Promise<void>
  clearToken(): Promise<void>
  getRefreshToken(): Promise<string | null>
  setRefreshToken(token: string): Promise<void>
  clearRefreshToken(): Promise<void>
}

export interface AuthConfig {
  apiBaseUrl: string
  clientId?: string
  clientSecret?: string
  redirectUri?: string
  tokenStorageKey: string
  refreshTokenStorageKey: string
  autoRefreshThreshold: number // minutes before expiry to refresh
}
