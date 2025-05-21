// CQRS Query: Get a value from safe storage
import { IpcHandler } from "../../interface/IpcHandler"
import keytar from "keytar"

export interface SafeStorageGetInput {
  key: string
}

export class SafeStorageGetQuery
  implements IpcHandler<SafeStorageGetInput, { value: string | null }>
{
  channel = "query:safeStorage:get"

  async handle(_event: Electron.IpcMainInvokeEvent, req: SafeStorageGetInput) {
    const value = await keytar.getPassword("vailabeling", req.key)
    return { value }
  }
}
