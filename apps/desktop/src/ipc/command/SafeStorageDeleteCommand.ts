// CQRS Command: Delete a value from safe storage
import { IpcHandler } from "../../interface/IpcHandler"
import keytar from "keytar"

export interface SafeStorageDeleteInput {
  key: string
}

export class SafeStorageDeleteCommand
  implements IpcHandler<SafeStorageDeleteInput, { success: boolean }>
{
  channel = "command:safeStorage:delete"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    req: SafeStorageDeleteInput
  ) {
    await keytar.deletePassword("vailabeling", req.key)
    return { success: true }
  }
}
