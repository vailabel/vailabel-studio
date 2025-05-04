// apps/desktop/ipc/yoloHandler.ts
import { ipcMain } from "electron"
import { spawn } from "child_process"
import { getPythonExec } from "../python/envManager"

export function registerYoloHandler() {
  ipcMain.handle("auto-label", async (_event, imagePath: string) => {
    return new Promise((resolve, reject) => {
      const py = spawn(getPythonExec(), [
        "../models/yolo_runner.py",
        imagePath,
      ])

      let output = ""
      py.stdout.on("data", (data) => (output += data.toString()))
      py.stderr.on("data", (err) =>
        console.error("[YOLO ERROR]", err.toString())
      )

      py.on("close", (code) => {
        if (code === 0) {
          try {
            const parsed = JSON.parse(output)
            resolve(parsed)
          } catch (err) {
            reject(new Error("Invalid JSON from YOLO"))
          }
        } else {
          reject(new Error(`YOLO exited with code ${code}`))
        }
      })
    })
  })
}
