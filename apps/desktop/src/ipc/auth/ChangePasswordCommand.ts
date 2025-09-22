import { IpcHandler } from "../../interface/IpcHandler"
import { UserRepository } from "../../db/models"
import * as bcrypt from "bcrypt"

export class ChangePasswordCommand implements IpcHandler<{ token: string; currentPassword: string; newPassword: string }, void> {
  channel = "changePassword:auth"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    request: { token: string; currentPassword: string; newPassword: string }
  ): Promise<void> {
    try {
      const { token, currentPassword, newPassword } = request
      
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

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password)
      if (!isValidPassword) {
        throw new Error("Current password is incorrect")
      }

      // Hash new password
      const saltRounds = 10
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds)

      // Update password
      await user.update({
        password: hashedNewPassword,
        updatedAt: new Date(),
      })
    } catch (error) {
      console.error("Failed to change password:", error)
      throw new Error("Failed to change password. Please check your current password.")
    }
  }

  private extractUserIdFromToken(token: string): string {
    const parts = token.split("_")
    return parts[1] || ""
  }
}
