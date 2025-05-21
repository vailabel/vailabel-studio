import { ipcMain } from "electron"
const path = require("path")
const { exec, execSync, spawn } = require("child_process")
import fs from "fs"
import { dialog } from "electron"
import { resolveResource, resolveUnpacked } from "../utils"

ipcMain.handle("run-yolo", async (event, data) => {
  const { modelPath, imagePath, pythonPath } = data

  const pythonScript = resolveUnpacked("ai/yolo.py")
  let cmd = `${pythonPath} "${pythonScript}" --model="${modelPath}" --image-base64="${imagePath}"`

  return new Promise((resolve, reject) => {
    const proc = exec(cmd)
    let stdout = ""
    let stderr = ""
    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString()
      // Send progress to renderer
      event.sender.send("yolo-progress", data.toString())
    })
    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString()
      // Optionally, send stderr as progress too
      event.sender.send("yolo-progress", data.toString())
    })
    proc.on("close", (code: number) => {
      let json = null
      try {
        const match = stdout.match(/(\[.*\]|\{.*\})/s)
        if (match) {
          json = JSON.parse(match[0])
        }
      } catch (e) {
        console.error("Failed to parse YOLO output JSON:", e)
      }
      if (code === 0) {
        resolve(json)
      } else {
        reject(stderr)
      }
    })
    proc.on("error", (err: Error) => {
      reject(err)
    })
  })
})

ipcMain.handle("install-python-package", async (event, { pythonPath }) => {
  // Check if all requirements are already satisfied
  const requirementsPath = resolveUnpacked("ai/requirements.txt")
  console.log("Checking requirements at:", requirementsPath)
  try {
    // update pip to the latest version
    const updateCmd = `${pythonPath} -m pip install --upgrade pip`
    execSync(updateCmd, { encoding: "utf-8" })
    // Use pip to check for missing requirements
    const checkCmd = `${pythonPath} -m pip install --dry-run -r "${requirementsPath}" --no-cache-dir`
    const checkResult = execSync(checkCmd, { encoding: "utf-8" })
    if (
      /Requirement already satisfied|0 to install|0 newly installed/.test(
        checkResult
      )
    ) {
      // All packages are already installed
      event.sender.send(
        "python-install-progress",
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
    const fullCmd = `${pythonPath} ${cmdArgs.map((a) => (a.includes(" ") ? `"${a}"` : a)).join(" ")}`
    event.sender.send(
      "python-install-progress",
      `\u001b[36m$ ${fullCmd}\u001b[0m\n`
    )
    const pipProc = spawn(pythonPath, cmdArgs)
    let stdout = ""
    let stderr = ""
    pipProc.stdout.on("data", (data: Buffer) => {
      const msg = data.toString()
      stdout += msg
      event.sender.send("python-install-progress", msg)
    })
    pipProc.stderr.on("data", (data: Buffer) => {
      const msg = data.toString()
      stderr += msg
      event.sender.send("python-install-progress", msg)
    })
    pipProc.on("close", (code: number) => {
      if (code === 0) {
        resolve(stdout)
      } else {
        reject(stderr)
      }
    })
    pipProc.on("error", (err: Error) => {
      reject(err)
    })
  })
})

ipcMain.handle("select-python-venv", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  })

  if (result.canceled || result.filePaths.length === 0) return null

  const venvPath = result.filePaths[0]
  const pythonPath = getPythonPathFromVenv(venvPath)

  if (!pythonPath) return null

  // Save it to a config file
  const config = { venvPath, pythonPath }
  return config
})

function getPythonPathFromVenv(venvDir: string) {
  const cfg = path.join(venvDir, "pyvenv.cfg")
  if (!fs.existsSync(cfg)) return null

  const isWin = process.platform === "win32"
  const bin = isWin ? "Scripts" : "bin"
  const exe = isWin ? "python.exe" : "python3"
  const fullPath = path.join(venvDir, bin, exe)

  return fs.existsSync(fullPath) ? fullPath : null
}
