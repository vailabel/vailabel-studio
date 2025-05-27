import path from "path"
import { IpcHandler } from "../../interface/IpcHandler"
import fs from "fs"

interface SelectPythonVenvCommandRequest {
  venvDir: string
}
interface SelectPythonVenvCommandResponse {
  pythonPath: string | null
  venvPath: string | null
}

export class SelectPythonVenvCommand
  implements
    IpcHandler<SelectPythonVenvCommandRequest, SelectPythonVenvCommandResponse>
{
  handle(
    event: Electron.IpcMainInvokeEvent,
    request: SelectPythonVenvCommandRequest
  ): Promise<SelectPythonVenvCommandResponse> {
    const venvDir = request.venvDir
    const pythonPath = this.getPythonPathFromVenv(venvDir)

    if (!pythonPath) {
      return Promise.resolve({
        pythonPath: null,
        venvPath: null,
      })
    }

    return Promise.resolve({
      pythonPath,
      venvPath: venvDir,
    })
  }
  channel = "command:selectPythonVenv"

  private getPythonPathFromVenv(venvDir: string) {
    const cfg = path.join(venvDir, "pyvenv.cfg")
    if (!fs.existsSync(cfg)) return null

    const isWin = process.platform === "win32"
    const bin = isWin ? "Scripts" : "bin"
    const exe = isWin ? "python.exe" : "python3"
    let fullPath = path.join(venvDir, bin, exe)

    // On macOS/Linux, also check for 'python' if 'python3' does not exist
    if (!isWin && !fs.existsSync(fullPath)) {
      fullPath = path.join(venvDir, bin, "python")
    }

    return fs.existsSync(fullPath) ? fullPath : null
  }
}
