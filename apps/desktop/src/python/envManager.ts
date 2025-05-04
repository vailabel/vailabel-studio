import { spawnSync, spawn } from "child_process"
import fs from "fs"
import path from "path"

const PYTHON_REQUIRED = "3.10"
const VENV_DIR = path.resolve(__dirname, "../../../models/.venv")
const PYTHON_EXEC =
  process.platform === "win32"
    ? path.join(VENV_DIR, "Scripts", "python.exe")
    : path.join(VENV_DIR, "bin", "python3")

export function checkPythonInstalled(): boolean {
  const result = spawnSync("python3", ["--version"])
  return (
    result.status === 0 && result.stdout.toString().includes(PYTHON_REQUIRED)
  )
}

export function createVenvIfNotExists(): boolean {
  if (fs.existsSync(PYTHON_EXEC)) return true

  console.log("[ENV] Creating Python virtual environment...")
  const result = spawnSync("python3", ["-m", "venv", VENV_DIR])

  return result.status === 0
}

export function installDependencies(): boolean {
  console.log("[ENV] Installing Python dependencies...")
  const pip =
    process.platform === "win32"
      ? path.join(VENV_DIR, "Scripts", "pip.exe")
      : path.join(VENV_DIR, "bin", "pip")

  const result = spawnSync(pip, ["install", "ultralytics"])

  return result.status === 0
}

export function getPythonExec(): string {
  return PYTHON_EXEC
}
