import { IpcHandler } from "../../interface/IpcHandler"
import { User } from "@vailabel/core"
import { UserRepository } from "../../db/models"
import * as bcrypt from "bcrypt"

interface RegisterCredentials {
  name: string
  email: string
  password: string
  role?: "admin" | "manager" | "reviewer" | "annotator"
}

interface AuthUser extends User {
  isAuthenticated: boolean
  permissions: string[]
}

export class RegisterCommand implements IpcHandler<RegisterCredentials, AuthUser> {
  channel = "register:users"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    credentials: RegisterCredentials
  ): Promise<AuthUser> {
    try {
      // Check if user already exists
      const existingUser = await UserRepository.findOne({
        where: { email: credentials.email }
      })

      if (existingUser) {
        throw new Error("User with this email already exists")
      }

      // Hash password
      const saltRounds = 10
      const hashedPassword = await bcrypt.hash(credentials.password, saltRounds)

      // Create new user
      const newUser = await UserRepository.create({
        name: credentials.name,
        email: credentials.email,
        password: hashedPassword,
        role: credentials.role || "annotator",
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Return user without password
      const authUser: AuthUser = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        password: "", // Don't return password
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt,
        isAuthenticated: true,
        permissions: this.getRolePermissions(newUser.role),
      }

      return authUser
    } catch (error) {
      console.error("Registration failed:", error)
      throw new Error("Registration failed. Please try again.")
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
