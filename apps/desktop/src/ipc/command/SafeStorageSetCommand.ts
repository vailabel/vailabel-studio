// CQRS Command: Set (create/update) a value in safe storage
import { IpcHandler } from "../../interface/IpcHandler"
import keytar from "keytar"

export interface SafeStorageSetInput {
  key: string
  value: string
}

export class SafeStorageSetCommand
  implements IpcHandler<SafeStorageSetInput, { success: boolean }>
{
  channel = "command:safeStorage:set"

  async handle(_event: Electron.IpcMainInvokeEvent, req: SafeStorageSetInput) {
    await keytar.setPassword("vailabeling", req.key, req.value)
    return { success: true }
  }
}
