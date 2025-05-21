import { IpcHandler } from "../../interface/IpcHandler"
import keytar from "keytar"

interface SafeStorageListInput {
  prefix?: string
}

export class SafeStorageListQuery
  implements IpcHandler<SafeStorageListInput, any>
{
  channel = "query:safeStorage:list"

  async handle(_event: Electron.IpcMainInvokeEvent, req: SafeStorageListInput) {
    const credentials = await keytar.findCredentials("vailabeling")
    let filtered = credentials
    if (req?.prefix) {
      filtered = credentials.filter((c) => c.account.startsWith(req.prefix!))
    }
    return JSON.stringify(filtered)
  }
}
