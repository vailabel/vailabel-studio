import { IpcHandler } from "../../interface/IpcHandler"
import { User } from "@vailabel/core"
import { UserRepository } from "../../db/models"
import * as bcrypt from "bcrypt"

interface AuthToken {
  accessToken: string
  refreshToken?: string
  expiresAt: number
  tokenType: "Bearer"
}

interface LoginCredentials {
  email: string
  password: string
}

interface AuthUser extends User {
  isAuthenticated: boolean
  permissions: string[]
}

export class LoginCommand implements IpcHandler<LoginCredentials, AuthUser> {
  channel = "login:users"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    credentials: LoginCredentials
  ): Promise<AuthUser> {
    console.log("LoginCommand.handle called with:", credentials.email)
    try {
      // Find user by email
      const user = await UserRepository.findOne({
        where: { email: credentials.email }
      })

      console.log("User found:", user ? "Yes" : "No")

      if (!user) {
        console.log("No user found with email:", credentials.email)
        throw new Error("Invalid email or password")
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(credentials.password, user.password)
      if (!isValidPassword) {
        throw new Error("Invalid email or password")
      }

      // Generate token (simple implementation for local auth)
      const token: AuthToken = {
        accessToken: `local_${user.id}_${Date.now()}`,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        tokenType: "Bearer",
      }

      // Return user without password
      const authUser: AuthUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        password: "", // Don't return password
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        isAuthenticated: true,
        permissions: this.getRolePermissions(user.role),
      }

      return authUser
    } catch (error) {
      console.error("Login failed:", error)
      throw new Error("Login failed. Please check your credentials.")
    }
  }

  private getRolePermissions(role: string): string[] {
    const permissions: Record<string, string[]> = {
      admin: [
        "users:read", "users:write", "users:delete",
        "projects:read", "projects:write", "projects:delete",
        "labels:read", "labels:write", "labels:delete",
        "annotations:read", "annotations:write", "annotations:delete",
        "settings:read", "settings:write",
        "ai_models:read", "ai_models:write", "ai_models:delete",
      ],
      manager: [
        "users:read",
        "projects:read", "projects:write",
        "labels:read", "labels:write",
        "annotations:read", "annotations:write",
        "settings:read",
        "ai_models:read", "ai_models:write",
      ],
      reviewer: [
        "projects:read",
        "labels:read",
        "annotations:read", "annotations:write",
        "ai_models:read",
      ],
      annotator: [
        "projects:read",
        "labels:read",
        "annotations:read", "annotations:write",
      ],
    }

    return permissions[role] || []
  }
}
