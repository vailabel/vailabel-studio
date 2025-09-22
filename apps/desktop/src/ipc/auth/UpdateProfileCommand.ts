import { IpcHandler } from "../../interface/IpcHandler"
import { User } from "@vailabel/core"
import { UserRepository } from "../../db/models"
import * as bcrypt from "bcrypt"

interface AuthUser extends User {
  isAuthenticated: boolean
  permissions: string[]
}

export class UpdateProfileCommand implements IpcHandler<{ token: string; updates: Partial<AuthUser> }, AuthUser> {
  channel = "updateProfile:auth"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    request: { token: string; updates: Partial<AuthUser> }
  ): Promise<AuthUser> {
    try {
      const { token, updates } = request
      
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

      // Update user fields (exclude sensitive fields)
      const allowedUpdates = {
        name: updates.name,
        email: updates.email,
        role: updates.role,
        updatedAt: new Date(),
      }

      // Remove undefined values
      const cleanUpdates = Object.fromEntries(
        Object.entries(allowedUpdates).filter(([_, value]) => value !== undefined)
      )

      await user.update(cleanUpdates)

      // Return updated user without password
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
      console.error("Failed to update profile:", error)
      throw new Error("Failed to update profile")
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
