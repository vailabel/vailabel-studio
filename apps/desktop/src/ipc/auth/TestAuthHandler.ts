import { IpcHandler } from "../../interface/IpcHandler"

export class TestAuthHandler implements IpcHandler<void, string> {
  channel = "test:auth"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    _request?: void
  ): Promise<string> {
    console.log("TestAuthHandler called successfully!")
    return "IPC is working!"
  }
}
