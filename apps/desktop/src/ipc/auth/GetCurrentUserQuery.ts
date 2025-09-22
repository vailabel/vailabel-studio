import { IpcHandler } from "../../interface/IpcHandler"
import { User } from "@vailabel/core"
import { UserRepository } from "../../db/models"

interface AuthUser extends User {
  isAuthenticated: boolean
  permissions: string[]
}

export class GetCurrentUserQuery implements IpcHandler<string, AuthUser> {
  channel = "getCurrentUser:auth"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    token: string
  ): Promise<AuthUser> {
    try {
      // Extract user ID from token
      const userId = this.extractUserIdFromToken(token)
      
      if (!userId) {
        throw new Error("Invalid token")
      }

      // Find user by ID
      const user = await UserRepository.findByPk(userId)
      
      if (!user) {
        throw new Error("User not found")
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
      console.error("Failed to get current user:", error)
      throw new Error("Failed to get user information")
    }
  }

  private extractUserIdFromToken(token: string): string {
    const parts = token.split("_")
    return parts[1] || ""
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
