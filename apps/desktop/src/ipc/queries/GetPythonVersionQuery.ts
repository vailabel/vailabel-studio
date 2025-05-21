import { execSync } from "child_process"
import { IpcHandler } from "../../interface/IpcHandler"

export interface GetPythonVersionInput {
  pythonPath?: string
}

export interface GetPythonVersionResult {
  pythonPath: string
  version: string | null
  pipVersion: string | null
  error?: string
}

export class GetPythonVersionQuery
  implements IpcHandler<GetPythonVersionInput, GetPythonVersionResult>
{
  channel = "query:getPythonVersion"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    req: GetPythonVersionInput = {}
  ): Promise<GetPythonVersionResult> {
    if (req && req.pythonPath) {
      try {
        const version = execSync(`${req.pythonPath} --version`)
          .toString()
          .trim()
        let pipVersion = ""
        try {
          pipVersion = execSync(`${req.pythonPath} -m pip --version`)
            .toString()
            .trim()
        } catch {
          pipVersion = "pip not found"
        }
        return { pythonPath: req.pythonPath, version, pipVersion }
      } catch (e) {
        return {
          pythonPath: req.pythonPath,
          version: null,
          pipVersion: null,
          error: e instanceof Error ? e.message : String(e),
        }
      }
    } else {
      return this.getPythonPath()
    }
  }

  private getPythonPath() {
    try {
      const pythonPath = execSync("which python3").toString().trim()
      const version = execSync(`${pythonPath} --version`).toString().trim()
      let pipVersion = ""
      try {
        pipVersion = execSync(`${pythonPath} -m pip --version`)
          .toString()
          .trim()
      } catch {
        pipVersion = "pip not found"
      }
      return { pythonPath, version, pipVersion }
    } catch (e) {
      return {
        pythonPath: "",
        version: null,
        pipVersion: null,
        error: e instanceof Error ? e.message : String(e),
      }
    }
  }
}
