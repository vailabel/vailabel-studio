import { AuthToken, AuthStorage } from "../contracts/IAuthService"

export class LocalAuthStorage implements AuthStorage {
  private tokenKey: string
  private refreshTokenKey: string

  constructor(tokenKey: string = "auth_token", refreshTokenKey: string = "refresh_token") {
    this.tokenKey = tokenKey
    this.refreshTokenKey = refreshTokenKey
  }

  async getToken(): Promise<AuthToken | null> {
    try {
      const tokenData = localStorage.getItem(this.tokenKey)
      if (!tokenData) return null

      const token = JSON.parse(tokenData) as AuthToken
      
      // Check if token is expired
      if (Date.now() >= token.expiresAt) {
        await this.clearToken()
        return null
      }

      return token
    } catch (error) {
      console.error("Failed to get token from storage:", error)
      await this.clearToken()
      return null
    }
  }

  async setToken(token: AuthToken): Promise<void> {
    try {
      localStorage.setItem(this.tokenKey, JSON.stringify(token))
    } catch (error) {
      console.error("Failed to save token to storage:", error)
      throw new Error("Failed to save authentication token")
    }
  }

  async clearToken(): Promise<void> {
    try {
      localStorage.removeItem(this.tokenKey)
    } catch (error) {
      console.error("Failed to clear token from storage:", error)
    }
  }

  async getRefreshToken(): Promise<string | null> {
    try {
      return localStorage.getItem(this.refreshTokenKey)
    } catch (error) {
      console.error("Failed to get refresh token from storage:", error)
      return null
    }
  }

  async setRefreshToken(token: string): Promise<void> {
    try {
      localStorage.setItem(this.refreshTokenKey, token)
    } catch (error) {
      console.error("Failed to save refresh token to storage:", error)
      throw new Error("Failed to save refresh token")
    }
  }

  async clearRefreshToken(): Promise<void> {
    try {
      localStorage.removeItem(this.refreshTokenKey)
    } catch (error) {
      console.error("Failed to clear refresh token from storage:", error)
    }
  }
}

export class ElectronAuthStorage implements AuthStorage {
  private tokenKey: string
  private refreshTokenKey: string

  constructor(tokenKey: string = "auth_token", refreshTokenKey: string = "refresh_token") {
    this.tokenKey = tokenKey
    this.refreshTokenKey = refreshTokenKey
  }

  async getToken(): Promise<AuthToken | null> {
    try {
      if (!window.ipc) {
        console.warn("IPC not available, falling back to localStorage")
        return new LocalAuthStorage(this.tokenKey, this.refreshTokenKey).getToken()
      }

      const result = await window.ipc.invoke("query:safeStorage:get", { key: this.tokenKey })
      if (!result || !result.value) return null

      const token = JSON.parse(result.value) as AuthToken
      
      // Check if token is expired
      if (Date.now() >= token.expiresAt) {
        await this.clearToken()
        return null
      }

      return token
    } catch (error) {
      console.error("Failed to get token from storage:", error)
      await this.clearToken()
      return null
    }
  }

  async setToken(token: AuthToken): Promise<void> {
    try {
      if (!window.ipc) {
        console.warn("IPC not available, falling back to localStorage")
        return new LocalAuthStorage(this.tokenKey, this.refreshTokenKey).setToken(token)
      }

      await window.ipc.invoke("command:safeStorage:set", { 
        key: this.tokenKey, 
        value: JSON.stringify(token) 
      })
    } catch (error) {
      console.error("Failed to save token to storage:", error)
      throw new Error("Failed to save authentication token")
    }
  }

  async clearToken(): Promise<void> {
    try {
      if (!window.ipc) {
        console.warn("IPC not available, falling back to localStorage")
        return new LocalAuthStorage(this.tokenKey, this.refreshTokenKey).clearToken()
      }

      await window.ipc.invoke("command:safeStorage:delete", { key: this.tokenKey })
    } catch (error) {
      console.error("Failed to clear token from storage:", error)
    }
  }

  async getRefreshToken(): Promise<string | null> {
    try {
      if (!window.ipc) {
        console.warn("IPC not available, falling back to localStorage")
        return new LocalAuthStorage(this.tokenKey, this.refreshTokenKey).getRefreshToken()
      }

      const result = await window.ipc.invoke("query:safeStorage:get", { key: this.refreshTokenKey })
      return result?.value || null
    } catch (error) {
      console.error("Failed to get refresh token from storage:", error)
      return null
    }
  }

  async setRefreshToken(token: string): Promise<void> {
    try {
      if (!window.ipc) {
        console.warn("IPC not available, falling back to localStorage")
        return new LocalAuthStorage(this.tokenKey, this.refreshTokenKey).setRefreshToken(token)
      }

      await window.ipc.invoke("command:safeStorage:set", { 
        key: this.refreshTokenKey, 
        value: token 
      })
    } catch (error) {
      console.error("Failed to save refresh token to storage:", error)
      throw new Error("Failed to save refresh token")
    }
  }

  async clearRefreshToken(): Promise<void> {
    try {
      if (!window.ipc) {
        console.warn("IPC not available, falling back to localStorage")
        return new LocalAuthStorage(this.tokenKey, this.refreshTokenKey).clearRefreshToken()
      }

      await window.ipc.invoke("command:safeStorage:delete", { key: this.refreshTokenKey })
    } catch (error) {
      console.error("Failed to clear refresh token from storage:", error)
    }
  }
}
