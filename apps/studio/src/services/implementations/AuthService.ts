import { 
  IAuthService, 
  AuthToken, 
  LoginCredentials, 
  RegisterCredentials, 
  AuthUser,
  AuthConfig 
} from "../contracts/IAuthService"
import { ApiClient } from "@/lib/ApiClient"
import { User } from "@vailabel/core"

export class CloudAuthService implements IAuthService {
  private api: ApiClient

  constructor(config: AuthConfig) {
    this.api = new ApiClient({
      baseUrl: config.apiBaseUrl,
      headers: {
        "Content-Type": "application/json",
      },
      getAuthToken: async () => {
        // This will be set by the auth context
        return null
      },
      cache: false, // Don't cache auth requests
    })
  }

  async login(credentials: LoginCredentials): Promise<AuthToken> {
    try {
      const formData = new FormData()
      formData.append("username", credentials.email)
      formData.append("password", credentials.password)

      const response = await this.api.post<{
        access_token: string
        refresh_token?: string
        expires_in: number
        token_type: string
      }>("/auth/token", formData)

      const expiresAt = Date.now() + (response.expires_in * 1000)
      
      const token: AuthToken = {
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        expiresAt,
        tokenType: "Bearer",
      }

      return token
    } catch (error) {
      console.error("Login failed:", error)
      throw new Error("Invalid email or password")
    }
  }

  async register(credentials: RegisterCredentials): Promise<AuthToken> {
    try {
      const response = await this.api.post<{
        access_token: string
        refresh_token?: string
        expires_in: number
        token_type: string
      }>("/auth/register", {
        name: credentials.name,
        email: credentials.email,
        password: credentials.password,
        role: credentials.role || "annotator",
      })

      const expiresAt = Date.now() + (response.expires_in * 1000)
      
      const token: AuthToken = {
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        expiresAt,
        tokenType: "Bearer",
      }

      return token
    } catch (error) {
      console.error("Registration failed:", error)
      throw new Error("Registration failed. Please check your information and try again.")
    }
  }

  async socialLogin(): Promise<AuthToken> {
    throw new Error("Social login not implemented in CloudAuthService")
  }

  async logout(): Promise<void> {
    try {
      // The logout endpoint might not exist, so we don't throw on failure
      await this.api.post("/auth/logout", {})
    } catch (_error) {
      console.warn("Logout request failed:", _error)
      // Don't throw - logout should always succeed locally
    }
  }

  async refreshToken(): Promise<AuthToken> {
    throw new Error("Token refresh not implemented in CloudAuthService")
  }

  async validateToken(): Promise<boolean> {
    try {
      await this.api.get("/auth/validate")
      return true
    } catch {
      return false
    }
  }

  async getCurrentUser(): Promise<AuthUser> {
    try {
      const user = await this.api.get<User>("/auth/me")

      return {
        ...user,
        isAuthenticated: true,
        permissions: await this.getUserPermissions(),
      }
    } catch (error) {
      console.error("Failed to get current user:", error)
      throw new Error("Failed to get user information")
    }
  }

  async updateProfile(_token: string, updates: Partial<User>): Promise<AuthUser> {
    try {
      const user = await this.api.put<User>("/auth/profile", updates)

      return {
        ...user,
        isAuthenticated: true,
        permissions: await this.getUserPermissions(),
      }
    } catch (error) {
      console.error("Failed to update profile:", error)
      throw new Error("Failed to update profile")
    }
  }

  async changePassword(_token: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      await this.api.put("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      })
    } catch (error) {
      console.error("Failed to change password:", error)
      throw new Error("Failed to change password. Please check your current password.")
    }
  }

  async getUserPermissions(): Promise<string[]> {
    try {
      const response = await this.api.get<{ permissions: string[] }>("/auth/permissions")
      return response.permissions
    } catch (error) {
      console.error("Failed to get user permissions:", error)
      return []
    }
  }
}

export class LocalAuthService implements IAuthService {
  private storage: AuthStorage

  constructor(storage: AuthStorage) {
    this.storage = storage
  }

  async login(credentials: LoginCredentials): Promise<AuthToken> {
    try {
      // Use Electron IPC to login
      const user = await window.ipc.invoke("login:users", credentials)
      
      // Generate a simple token (in production, use proper JWT)
      const token: AuthToken = {
        accessToken: `local_${user.id}_${Date.now()}`,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        tokenType: "Bearer",
      }

      return token
    } catch (error) {
      console.error("Login failed:", error)
      throw new Error("Invalid email or password")
    }
  }

  async register(credentials: RegisterCredentials): Promise<AuthToken> {
    try {
      // Use Electron IPC to register
      const user = await window.ipc.invoke("register:users", credentials)
      
      // Generate a simple token (in production, use proper JWT)
      const token: AuthToken = {
        accessToken: `local_${user.id}_${Date.now()}`,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        tokenType: "Bearer",
      }

      return token
    } catch (error) {
      console.error("Registration failed:", error)
      throw new Error("Registration failed. Please try again.")
    }
  }

  async socialLogin(): Promise<AuthToken> {
    throw new Error("Social login not supported in local mode")
  }

  async logout(): Promise<void> {
    try {
      await window.ipc.invoke("logout:users")
    } catch (error) {
      console.error("Logout failed:", error)
      // Don't throw - logout should always succeed locally
    }
  }

  async refreshToken(): Promise<AuthToken> {
    // For local mode, we don't implement refresh tokens
    throw new Error("Token refresh not supported in local mode")
  }

  async validateToken(): Promise<boolean> {
    try {
      const token = await this.storage.getToken()
      if (!token) {
        return false
      }
      return await window.ipc.invoke("validateToken:auth", token.accessToken)
    } catch (error) {
      console.error("Token validation failed:", error)
      return false
    }
  }

  async getCurrentUser(): Promise<AuthUser> {
    try {
      const token = await this.storage.getToken()
      if (!token) {
        throw new Error("No authentication token found")
      }
      return await window.ipc.invoke("getCurrentUser:auth", token.accessToken)
    } catch (error) {
      console.error("Failed to get current user:", error)
      throw new Error("Failed to get user information")
    }
  }

  async updateProfile(_token: string, updates: Partial<User>): Promise<AuthUser> {
    try {
      const token = await this.storage.getToken()
      if (!token) {
        throw new Error("No authentication token found")
      }
      return await window.ipc.invoke("updateProfile:auth", {
        token: token.accessToken,
        updates
      })
    } catch (error) {
      console.error("Failed to update profile:", error)
      throw new Error("Failed to update profile")
    }
  }

  async changePassword(_token: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      const token = await this.storage.getToken()
      if (!token) {
        throw new Error("No authentication token found")
      }
      await window.ipc.invoke("changePassword:auth", {
        token: token.accessToken,
        currentPassword,
        newPassword
      })
    } catch (error) {
      console.error("Failed to change password:", error)
      throw new Error("Failed to change password. Please check your current password.")
    }
  }

  async getUserPermissions(): Promise<string[]> {
    try {
      const token = await this.storage.getToken()
      if (!token) {
        return []
      }
      const user = await window.ipc.invoke("getCurrentUser:auth", token.accessToken)
      return user.permissions || []
    } catch (error) {
      console.error("Failed to get user permissions:", error)
      return []
    }
  }
}
