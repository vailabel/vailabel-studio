import { useState, useEffect } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { isElectron } from "@/lib/constants"
import ExternalLink from "../exteral-link"
import { useSettingsStore } from "@/stores/use-settings-store"
import { ElectronFileInput } from "../electron-file"

interface PythonInfo {
  pythonPath: string | null
  version: string | null
  pipVersion: string | null
  error?: string | null
}

interface SelectedPythonVenv {
  pythonPath: string
  venvPath: string
}
export const InstallPythonPackage = () => {
  const { toast } = useToast()
  const [isDetectingPython, setIsDetectingPython] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [installProgress, setInstallProgress] = useState<string>("")
  const [alreadyInstalled, setAlreadyInstalled] = useState(false)
  const [pythonError, setPythonError] = useState<string | null>(null)
  const [pythonInfo, setPythonInfo] = useState<PythonInfo>({
    pythonPath: null,
    version: null,
    pipVersion: null,
    error: null,
  })

  const { updateSetting } = useSettingsStore()

  // Listen for python install progress (Electron only)
  useEffect(() => {
    if (!isElectron()) return
    setInstallProgress("")
    const handler = (msg: unknown) => {
      if (
        typeof msg === "object" &&
        msg !== null &&
        "type" in msg &&
        (msg as { type: string }).type === "stdout" &&
        "data" in msg &&
        typeof (msg as { data: unknown }).data === "string"
      ) {
        setInstallProgress((prev) => prev + (msg as { data: string }).data)
      } else if (typeof msg === "string") {
        setInstallProgress((prev) => prev + msg)
      }
    }
    window.ipc.on?.("event:pythonInstallProgress", handler)
    return () => {
      window.ipc.off?.("event:pythonInstallProgress", handler)
      setInstallProgress("")
    }
  }, [])

  // On mount, load pythonPath from settings and fetch version info if present
  useEffect(() => {
    const storedPythonPath = useSettingsStore
      .getState()
      .settings.find((s) => s.key === "pythonPath")?.value
    if (storedPythonPath) {
      setIsDetectingPython(true)
      window.ipc
        .invoke("query:getPythonVersion", { pythonPath: storedPythonPath })
        .then((info) => {
          const pyInfo = info as PythonInfo
          setPythonInfo({
            pythonPath: pyInfo.pythonPath || storedPythonPath,
            version: pyInfo.version || null,
            pipVersion: pyInfo.pipVersion || null,
            error: pyInfo.error || null,
          })
          setIsDetectingPython(false)
        })
        .catch((error: unknown) => {
          setPythonInfo({
            pythonPath: storedPythonPath,
            version: null,
            pipVersion: null,
            error: error instanceof Error ? error.message : String(error),
          })
          setIsDetectingPython(false)
        })
    }
  }, [])

  // Handler to install Python packages (requirements.txt)
  const handleInstallPythonPackages = async () => {
    if (!pythonInfo.pythonPath) {
      toast({
        title: "Python not found",
        description: "Python 3 is not detected on your system.",
        variant: "destructive",
      })
      return
    }
    setIsInstalling(true)
    setInstallProgress("")
    setAlreadyInstalled(false)
    try {
      const result = await window.ipc.invoke("command:installPythonPackage", {
        pythonPath: pythonInfo.pythonPath,
        requirementsPath: "ai/requirements.txt",
      })
      if (result && result.alreadyInstalled) {
        setAlreadyInstalled(true)
        toast({
          title: "All packages installed",
          description: "All required Python packages are already installed.",
        })
      } else {
        toast({
          title: "Packages installed",
          description: "Python requirements installed successfully.",
        })
      }
    } catch (e) {
      toast({
        title: "Install failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      })
    } finally {
      setIsInstalling(false)
    }
  }

  // Type guard for Electron file objects
  function hasPathProp(file: unknown): file is { path: string } {
    return (
      typeof file === "object" &&
      file !== null &&
      "path" in file &&
      typeof (file as Record<string, unknown>).path === "string"
    )
  }

  // Handler for selecting a Python venv directory
  const handleFileChange = async (event: {
    target: { files: FileList | string[] }
  }) => {
    try {
      const files = event.target.files
      let filePath: string | undefined
      if (Array.isArray(files)) {
        filePath = files[0]
      } else if (files && files.length > 0) {
        const fileObj = files[0]
        if (hasPathProp(fileObj)) {
          filePath = fileObj.path
        } else if (typeof fileObj === "string") {
          filePath = fileObj
        }
      }
      if (!filePath) {
        setPythonError("No folder selected.")
        return
      }
      setPythonError(null)
      setIsDetectingPython(true)
      const result: SelectedPythonVenv = await window.ipc.invoke(
        "command:selectPythonVenv",
        { venvDir: filePath }
      )
      if (!result || !result.pythonPath) {
        setPythonError("Invalid Python virtual environment selected.")
        setIsDetectingPython(false)
        return
      }
      // Query Python version info for the selected pythonPath
      const info = await window.ipc.invoke("query:getPythonVersion", {
        pythonPath: result.pythonPath,
      })
      const pyInfo = info as PythonInfo
      setPythonInfo({
        pythonPath: pyInfo.pythonPath || result.pythonPath,
        version: pyInfo.version || null,
        pipVersion: pyInfo.pipVersion || null,
        error: pyInfo.error || null,
      })
      setIsDetectingPython(false)
      // Only update pythonPath in settings to the venv's pythonPath
      updateSetting("pythonPath", result.pythonPath)
    } catch (error) {
      setPythonError(error instanceof Error ? error.message : String(error))
      setIsDetectingPython(false)
    }
  }

  // Handler for selecting a Python executable directly
  const handlePythonBinaryChange = async (event: {
    target: { files: FileList | string[] }
  }) => {
    try {
      const files = event.target.files
      let filePath: string | undefined
      if (Array.isArray(files)) {
        filePath = files[0]
      } else if (files && files.length > 0) {
        const fileObj = files[0]
        if (hasPathProp(fileObj)) {
          filePath = fileObj.path
        } else if (typeof fileObj === "string") {
          filePath = fileObj
        }
      }
      if (!filePath) {
        setPythonError("No file selected.")
        return
      }
      setPythonError(null)
      setIsDetectingPython(true)
      // Query Python version info for the selected pythonPath
      const info = await window.ipc.invoke("query:getPythonVersion", {
        pythonPath: filePath,
      })
      const pyInfo = info as PythonInfo
      setPythonInfo({
        pythonPath: pyInfo.pythonPath || filePath,
        version: pyInfo.version || null,
        pipVersion: pyInfo.pipVersion || null,
        error: pyInfo.error || null,
      })
      setIsDetectingPython(false)
      // Update settings: set pythonPath
      updateSetting("pythonPath", filePath)
    } catch (error) {
      setPythonError(error instanceof Error ? error.message : String(error))
      setIsDetectingPython(false)
    }
  }

  return (
    <div className="flex-1 min-w-[350px] p-5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex flex-col justify-between">
      <div>
        {/* Help/Documentation Link */}
        <div className="mb-3">
          <ExternalLink
            href="https://vailabel.com/docs/python-venv-setup"
            target="_blank"
            className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            <span>Need help with Python setup?</span>
          </ExternalLink>
        </div>
        <div className="font-semibold text-lg mb-1">Python Environment</div>
        {isDetectingPython ? (
          <div className="text-xs text-gray-500">Detecting Python...</div>
        ) : pythonInfo.error ? (
          <div className="text-xs text-red-500">{pythonInfo.error}</div>
        ) : pythonInfo.pythonPath ? (
          <>
            <div className="text-xs text-gray-700 dark:text-gray-300">
              Path:{" "}
              <span className="font-mono break-all">
                {pythonInfo.pythonPath}
              </span>
            </div>
            <div className="text-xs text-gray-700 dark:text-gray-300">
              Python: {pythonInfo.version}
            </div>
            <div className="text-xs text-gray-700 dark:text-gray-300">
              Pip: {pythonInfo.pipVersion}
            </div>
          </>
        ) : (
          <div className="text-xs text-red-500">Python 3 not found</div>
        )}
        {isInstalling && (
          <div className="mt-4 flex-1 flex flex-col">
            <div className="font-semibold text-xs mb-1 text-gray-700 dark:text-gray-300">
              Install Progress
            </div>
            {/* Split installProgress into command and output */}
            {(() => {
              const [command, ...outputLines] = (
                installProgress || "Starting pip..."
              ).split(/\r?\n/)
              return (
                <div className="flex flex-col">
                  <div className="mb-2 px-2 py-1 rounded bg-blue-900 text-blue-200 font-mono text-xs font-semibold border border-blue-700">
                    {command}
                  </div>
                  <pre className="flex-1 max-h-56 overflow-y-auto text-xs bg-black text-green-200 rounded p-2 whitespace-pre-wrap border border-gray-700">
                    {outputLines.join("\n")}
                  </pre>
                </div>
              )
            })()}
          </div>
        )}
        {/* Add browse python path from venv button below Python info */}
        <div className="flex items-center gap-2 mt-2">
          <ElectronFileInput
            placeholder="Select Python venv folder"
            onChange={handleFileChange}
            options={{
              properties: ["openDirectory"],
              filters: [
                {
                  name: "Python Virtual Environments",
                  extensions: ["venv", "pyenv", "virtualenv"],
                },
                { name: "All Files", extensions: ["*"] },
              ],
            }}
          />
          <span className="text-xs text-gray-500">or</span>
          <ElectronFileInput
            placeholder="Select Python executable"
            onChange={handlePythonBinaryChange}
            options={{
              properties: ["openFile"],
              filters: [
                {
                  name: "Python Executable",
                  extensions: ["exe", "bin", "py", "*python*"],
                },
                { name: "All Files", extensions: ["*"] },
              ],
            }}
          />
        </div>
        {/* Python error message display */}
        {pythonError && (
          <div style={{ color: "red", marginTop: 8 }}>{pythonError}</div>
        )}
      </div>
      <div className="mt-6 flex justify-end">
        <Button
          size="sm"
          onClick={handleInstallPythonPackages}
          disabled={
            !pythonInfo.pythonPath ||
            isInstalling ||
            isDetectingPython ||
            alreadyInstalled
          }
          className="w-full"
        >
          {alreadyInstalled ? (
            <span className="flex items-center text-yellow-500">
              <Check className="mr-2 h-4 w-4" />
              All Packages Installed
            </span>
          ) : isInstalling ? (
            <span className="flex items-center">
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              Installing...
            </span>
          ) : (
            "Install Packages"
          )}
        </Button>
      </div>
    </div>
  )
}

export default InstallPythonPackage
