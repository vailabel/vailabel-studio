import { IpcHandler } from "../../interface/IpcHandler"

export class ValidateTokenQuery implements IpcHandler<string, boolean> {
  channel = "validateToken:auth"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    token: string
  ): Promise<boolean> {
    try {
      // Simple validation for local tokens
      if (!token || !token.startsWith("local_")) {
        return false
      }

      // Extract timestamp from token
      const parts = token.split("_")
      if (parts.length < 3) {
        return false
      }

      const timestamp = parseInt(parts[2])
      const now = Date.now()
      const tokenAge = now - timestamp
      const maxAge = 24 * 60 * 60 * 1000 // 24 hours

      // Check if token is expired
      if (tokenAge > maxAge) {
        return false
      }

      return true
    } catch (error) {
      console.error("Token validation failed:", error)
      return false
    }
  }
}
