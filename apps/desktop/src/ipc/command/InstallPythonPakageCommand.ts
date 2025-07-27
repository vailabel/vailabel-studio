import { IpcHandler } from "../../interface/IpcHandler"

import { execSync, spawn } from "child_process"
import { resolveUnpacked } from "../../utils"

interface InstallPythonPackageInput {
  pythonPath: string
  requirementsPath: string
}

interface InstallPythonPackageResult {
  success?: boolean
  error?: string
  alreadyInstalled?: boolean
}

export class InstallPythonPackageCommand
  implements IpcHandler<InstallPythonPackageInput, InstallPythonPackageResult>
{
  channel = "command:installPythonPackage"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    req: InstallPythonPackageInput
  ): Promise<InstallPythonPackageResult> {
    const requirementsPath = resolveUnpacked(req.requirementsPath)
    try {
      // update pip to the latest version
      const updateCmd = `${req.pythonPath} -m pip install --upgrade pip`
      execSync(updateCmd, { encoding: "utf-8" })
      // Use pip to check for missing requirements
      const checkCmd = `${req.pythonPath} -m pip install --dry-run -r "${requirementsPath}" --no-cache-dir`
      const checkResult = execSync(checkCmd, { encoding: "utf-8" })
      if (
        /Requirement already satisfied|0 to install|0 newly installed/.test(
          checkResult
        )
      ) {
        // All packages are already installed
        _event.sender.send(
          "event:pythonInstallProgress",
          "\u001b[33mAll required packages are already installed.\u001b[0m\n"
        )
        return { alreadyInstalled: true }
      }
    } catch (e) {
      // If dry-run fails, proceed to install as fallback
    }
    return new Promise((resolve, reject) => {
      const cmdArgs = [
        "-m",
        "pip",
        "install",
        "-r",
        requirementsPath,
        "--no-cache-dir",
      ]
      const fullCmd = `${req.pythonPath} ${cmdArgs
        .map((a) => (a.includes(" ") ? `\"${a}\"` : a))
        .join(" ")}`
      _event.sender.send(
        "python-install-progress",
        `\u001b[36m$ ${fullCmd}\u001b[0m\n`
      )
      const pipProc = spawn(req.pythonPath, cmdArgs, {
        detached: true,
        stdio: ["ignore", "pipe", "pipe"],
      })
      pipProc.unref()
      pipProc.stdout.on("data", (data: Buffer) => {
        const msg = data.toString()
        _event.sender.send("event:pythonInstallProgress", msg)
      })
      pipProc.stderr.on("data", (data: Buffer) => {
        const msg = data.toString()
        _event.sender.send("event:pythonInstallProgress", msg)
      })
      pipProc.on("close", (code: number) => {
        if (code === 0) {
          _event.sender.send(
            "event:pythonInstallProgress",
            "\u001b[32mPython package installation completed.\u001b[0m\n"
          )
          resolve({ success: true })
        } else {
          _event.sender.send(
            "event:pythonInstallProgress",
            "\u001b[31mPython package installation failed.\u001b[0m\n"
          )
          // No stderr buffer, just send a generic error
          reject({ error: "Python package installation failed." })
        }
      })
      pipProc.on("error", (err: Error) => {
        reject(err)
      })
    })
  }
}
