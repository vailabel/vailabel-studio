import { IpcHandler } from "../../interface/IpcHandler"
import { shell } from "electron"

export class OpenExternalLinkCommand implements IpcHandler<string, void> {
  channel = "command:openExternalLink"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    url: string
  ): Promise<void> {
    shell.openExternal(url)
  }
}
