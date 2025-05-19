import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { X, Check, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import { useDataAccess } from "@/hooks/use-data-access"
import { AIModel } from "@vailabel/core"
import { isElectron } from "@/lib/constants"

interface AIModelModalProps {
  onClose: () => void
}

export function AIModelModal({ onClose }: AIModelModalProps) {
  const { toast } = useToast()
  const [availableModels, setAvailableModels] = useState<AIModel[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(
    undefined
  )
  const [isUploading, setIsUploading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [pythonInfo, setPythonInfo] = useState<{
    pythonPath: string | null
    version: string | null
    pipVersion: string | null
    error?: string | null
  }>({
    pythonPath: null,
    version: null,
    pipVersion: null,
  })
  const [isDetectingPython, setIsDetectingPython] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [installProgress, setInstallProgress] = useState<string>("")
  const [alreadyInstalled, setAlreadyInstalled] = useState(false)
  const [pythonError, setPythonError] = useState<string | null>(null)
  const { getAvailableModels, uploadCustomModel, selectModel, updateSetting } =
    useDataAccess()

  // Load available models on mount
  useState(() => {
    const loadModels = async () => {
      try {
        const models = await getAvailableModels()
        setAvailableModels(models)
        if (models.length > 0) {
          setSelectedModelId(models[0].id)
        }
      } catch (error) {
        console.error("Failed to load models:", error)
        toast({
          title: "Error",
          description: "Failed to load available models",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
    loadModels()
  })

  // Detect Python info on mount (Electron only)
  useEffect(() => {
    if (isElectron()) {
      setIsDetectingPython(true)
      window.ipc
        .invoke("get-python-info")
        .then((info) => {
          const pyInfo = info as {
            pythonPath: string | null
            version: string | null
            pipVersion: string | null
            error?: string | null
          }
          setPythonInfo(pyInfo)
          setIsDetectingPython(false)
          if (pyInfo.pythonPath && updateSetting) {
            updateSetting("pythonPath", pyInfo.pythonPath)
          }
        })
        .catch((error: unknown) => {
          setPythonInfo({
            pythonPath: null,
            version: null,
            pipVersion: null,
            error: error instanceof Error ? error.message : String(error),
          })
          setIsDetectingPython(false)
        })
    }
  }, [updateSetting])

  // Listen for python install progress (Electron only)
  useEffect(() => {
    if (!isElectron()) return
    setInstallProgress("")
    const handler = (_event: unknown, msg: string) => {
      setInstallProgress((prev) => prev + msg)
    }
    window.ipc.on?.("python-install-progress", handler)
    return () => {
      window.ipc.off?.("python-install-progress", handler)
      setInstallProgress("")
    }
  }, [])

  const handleModelUpload = async () => {
    if (!isElectron()) {
      toast({
        title: "Not supported",
        description:
          "Model file path registration is only supported in the desktop app.",
        variant: "destructive",
      })
      return
    }
    const filePath = await window.ipc.invoke("openModelFileDialog")
    if (!filePath) {
      toast({
        title: "No file selected",
        description: "Please select a .pt model file.",
        variant: "destructive",
      })
      return
    }
    // Extract file name from path
    const fileName = filePath.split(/[\\/]/).pop() || "model.pt"
    if (!fileName.endsWith(".pt")) {
      toast({
        title: "Invalid file",
        description: "Please select a valid PyTorch model file (.pt)",
        variant: "destructive",
      })
      return
    }
    setIsUploading(true)
    try {
      const now = new Date()
      const model: AIModel = {
        id: fileName,
        name: fileName,
        description: "",
        version: "1.0.0",
        createdAt: now,
        updatedAt: now,
        modelPath: filePath,
        configPath: "",
        modelSize: 0, // Size unknown unless you fetch it via Node
        isCustom: true,
      }
      await uploadCustomModel(model)
      const models = await getAvailableModels()
      setAvailableModels(models)
      const uploaded =
        models.find((m) => m.name === fileName) || models[models.length - 1]
      setSelectedModelId(uploaded?.id)
      toast({
        title: "Model registered",
        description: `Registered model ${fileName}\nFile path: ${filePath}`,
      })
    } catch (error) {
      console.error("Failed to register model:", error)
      toast({
        title: "Registration failed",
        description: "Failed to register the model",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleModelSelect = async () => {
    if (!selectedModelId) return
    try {
      await selectModel(selectedModelId)
      const selectedModel = availableModels.find(
        (m) => m.id === selectedModelId
      )
      toast({
        title: "Model selected",
        description: `Now using ${selectedModel?.name || selectedModelId} for detection`,
      })
      onClose()
    } catch (error) {
      console.error("Failed to select model:", error)
      toast({
        title: "Error",
        description: "Failed to select the model",
        variant: "destructive",
      })
    }
  }

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
      const result = await window.ipc.invoke("install-python-package", {
        pythonPath: pythonInfo.pythonPath,
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

  const handleBrowsePython = async () => {
    setPythonError(null)
    setIsDetectingPython(true)
    try {
      const result = await window.ipc.invoke("select-python-venv")
      if (!result) return
      if (typeof result === "object" && result.error) {
        setPythonError(result.error)
        toast({
          title: "Python Error",
          description: result.error,
          variant: "destructive",
        })
        setIsDetectingPython(false)
        return
      }
      // If result is an object (e.g. { venvPath, pythonPath }), extract pythonPath
      let pythonPath = result
      if (typeof result === "object" && result.pythonPath) {
        pythonPath = result.pythonPath
      }
      setPythonInfo((prev) => ({ ...prev, pythonPath }))
      if (updateSetting) {
        await updateSetting("pythonPath", pythonPath)
      }
      // Optionally, update version info
      const info = await window.ipc.invoke("get-python-info", {
        pythonPath,
      })
      setPythonInfo(info)
      setIsDetectingPython(false)
      toast({
        title: "Python environment updated.",
        description: typeof pythonPath === "string" ? pythonPath : undefined,
      })
    } catch (e) {
      const errMsg =
        e instanceof Error ? e.message : "Failed to select Python environment."
      setPythonError(errMsg)
      toast({
        title: "Python Error",
        description: errMsg,
        variant: "destructive",
      })
      setIsDetectingPython(false)
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-3xl min-h-[600px] rounded-xl p-10 shadow-2xl bg-white dark:bg-gray-800 dark:text-gray-100 flex flex-col"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">AI Detection Models</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
        <div className="flex flex-col md:flex-row gap-8 flex-1">
          <div className="flex-1 min-w-[300px]">
            <p className="text-base text-gray-600 dark:text-gray-400 mb-4">
              Select a pre-trained model or upload your own custom YOLOv8 model
              (.pt file)
            </p>
            {isLoading ? (
              <div className="my-8 flex justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 dark:border-gray-600 dark:border-t-blue-400"></div>
              </div>
            ) : (
              <RadioGroup
                value={selectedModelId}
                onValueChange={setSelectedModelId}
                className="mt-4 space-y-3"
              >
                {availableModels.map((model) => (
                  <div key={model.id} className="flex items-start space-x-2">
                    <RadioGroupItem
                      value={model.id}
                      id={model.id}
                      className="mt-1"
                    />
                    <div>
                      <Label
                        htmlFor={model.id}
                        className="flex items-center dark:text-gray-300"
                      >
                        {selectedModelId === model.id && (
                          <Check className="mr-2 h-4 w-4" />
                        )}
                        {model.name}
                      </Label>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            )}
            <div className="mt-8">
              <Label
                htmlFor="model-upload"
                className="dark:text-gray-300 flex items-center"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload custom model
              </Label>
              {/* Only show the file input if not Electron */}
              {!isElectron() && (
                <div className="mt-1 flex">
                  <Input
                    id="model-upload"
                    type="file"
                    accept=".pt"
                    onChange={handleModelUpload}
                    disabled={isUploading}
                    className="flex-1 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                  />
                  {isUploading && (
                    <div className="ml-2 flex h-10 w-10 items-center justify-center">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 dark:border-gray-600 dark:border-t-blue-400"></div>
                    </div>
                  )}
                </div>
              )}
              {/* In Electron, show a button to open the file dialog */}
              {isElectron() && (
                <div className="mt-1 flex">
                  <Button
                    onClick={handleModelUpload}
                    disabled={isUploading}
                    className="flex-1 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                  >
                    {isUploading ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        Registering...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Select Model File (.pt)
                      </>
                    )}
                  </Button>
                </div>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Only YOLOv8 PyTorch models (.pt) are supported
              </p>
            </div>
          </div>
          {/* Python detection and install UI */}
          {isElectron() && (
            <div className="flex-1 min-w-[350px] p-5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex flex-col justify-between">
              <div>
                <div className="font-semibold text-lg mb-1">
                  Python Environment
                </div>
                {isDetectingPython ? (
                  <div className="text-xs text-gray-500">
                    Detecting Python...
                  </div>
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
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBrowsePython}
                    disabled={isDetectingPython || isInstalling}
                  >
                    Browse Python from venv
                  </Button>
                  {pythonInfo.pythonPath && (
                    <span className="text-xs font-mono break-all text-gray-500 dark:text-gray-400">
                      {pythonInfo.pythonPath}
                    </span>
                  )}
                </div>
                {/* Python error message display */}
                {pythonError && (
                  <div style={{ color: "red", marginTop: 8 }}>
                    {pythonError}
                  </div>
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
          )}
        </div>
        <div className="mt-8 flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleModelSelect}
            disabled={!selectedModelId || isUploading || isLoading}
          >
            {isUploading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Uploading...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Use Selected Model
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
