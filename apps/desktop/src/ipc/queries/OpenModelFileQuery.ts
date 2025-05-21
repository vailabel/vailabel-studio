import { IpcHandler } from "../../interface/IpcHandler"

import { dialog, OpenDialogOptions } from "electron"

export interface OpenModelFileInput {
  options?: OpenDialogOptions
}
export interface OpenModelFileResult {
  content?: string
  error?: string
}

export class OpenModelFileQuery
  implements IpcHandler<OpenModelFileInput, OpenModelFileResult>
{
  channel = "query:openModelDialog"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    req: OpenModelFileInput
  ): Promise<OpenModelFileResult> {
    const options: OpenDialogOptions = {
      properties: ["openFile"],
      filters: [
        { name: "Model Files", extensions: ["json", "yaml", "yml"] },
        { name: "All Files", extensions: ["*"] },
      ],
      ...req.options,
    }

    return new Promise((resolve, reject) => {
      dialog
        .showOpenDialog(options)
        .then((result) => {
          if (result.canceled) {
            resolve({ error: "User canceled the dialog" })
          } else {
            resolve({ content: result.filePaths[0] })
          }
        })
        .catch((error) => {
          reject({ error: error.message })
        })
    })
  }
}
