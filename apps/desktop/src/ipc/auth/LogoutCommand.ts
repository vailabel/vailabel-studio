import { IpcHandler } from "../../interface/IpcHandler"

export class LogoutCommand implements IpcHandler<void, void> {
  channel = "logout:users"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    _request?: void
  ): Promise<void> {
    // For local authentication, logout is always successful
    // In a real implementation, you might want to invalidate tokens
    // or perform cleanup operations
    return Promise.resolve()
  }
}
