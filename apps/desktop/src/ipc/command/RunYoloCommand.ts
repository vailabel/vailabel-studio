import { IpcHandler } from "../../interface/IpcHandler"
import { resolveUnpacked } from "../../utils"
const { exec, execSync, spawn } = require("child_process")

interface YoloCommandRequest {
  modelPath: string
  imagePath: string
  pythonPath: string
}
interface YoloCommandResponse {
  data: any
}

export class RunYoloCommand
  implements IpcHandler<YoloCommandRequest, YoloCommandResponse>
{
  channel = "command:runYolo"

  async handle(
    _event: Electron.IpcMainInvokeEvent,
    { modelPath, imagePath, pythonPath }: YoloCommandRequest
  ): Promise<YoloCommandResponse> {
    const pythonScript = resolveUnpacked("ai/yolo.py")
    let cmd = `${pythonPath} "${pythonScript}" --model="${modelPath}" --image-base64="${imagePath}"`

    return new Promise((resolve, reject) => {
      const proc = exec(cmd)
      let stdout = ""
      let stderr = ""
      proc.stdout.on("data", (data: Buffer) => {
        stdout += data.toString()
        // Send progress to renderer
        _event.sender.send("event:run-yolo-progress", data.toString())
      })
      proc.stderr.on("data", (data: Buffer) => {
        stderr += data.toString()
        // Optionally, send stderr as progress too
        _event.sender.send("event:run-yolo-progress", data.toString())
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
  }
}
