import { useEffect, useState } from "react"
import { useDataAccess } from "@/hooks/use-data-access"
import type { AIModel } from "@vailabel/core/src/models/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, X } from "lucide-react"
import { useProjectsStore } from "@/hooks/use-store"

const SYSTEM_MODELS = [
  {
    name: "Segment Anything 2.0",
    description: "State-of-the-art segmentation model for any object.",
    id: "segment-anything-2.0",
    variants: [
      {
        name: "sam2.1_hiera_tiny.pt",
        downloadUrl:
          "https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_tiny.pt",
      },
      {
        name: "sam2.1_hiera_small.pt",
        downloadUrl:
          "https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_small.pt",
      },
      {
        name: "sam2.1_hiera_base_plus.pt",
        downloadUrl:
          "https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_base_plus.pt",
      },
      {
        name: "sam2.1_hiera_large.pt",
        downloadUrl:
          "https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_large.pt",
      },
    ],
  },
  {
    name: "YOLO",
    description: "You Only Look Once - real-time object detection.",
    id: "yolo",
    downloadUrl: "#", // Already done
    done: true,
  },
  {
    name: "Human pose estimation",
    description: "Detect and estimate human poses in images.",
    id: "human-pose-estimation",
    downloadUrl: "#", // TODO: Replace with real URL
  },
  {
    name: "TransT",
    description: "Transformer-based visual tracking model.",
    id: "transt",
    downloadUrl: "#", // TODO: Replace with real URL
  },
]

export default function AIModelListPage() {
  const dataAccess = useProjectsStore()
  const [models, setModels] = useState<AIModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSystemModal, setShowSystemModal] = useState(false)
  const [detailModel, setDetailModel] = useState<AIModel | null>(null)
  const [showAddModelModal, setShowAddModelModal] = useState(false)
  const [addModelFile, setAddModelFile] = useState<File | null>(null)
  const [addModelLoading, setAddModelLoading] = useState(false)
  const [addModelError, setAddModelError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    dataAccess
      .getAvailableModels()
      .then(setModels)
      .catch((e) => setError(e.message || "Failed to load models"))
      .finally(() => setLoading(false))
  }, [dataAccess])

  // Handler for file input change
  const handleAddModelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddModelError(null)
    if (e.target.files && e.target.files[0]) {
      setAddModelFile(e.target.files[0])
    } else {
      setAddModelFile(null)
    }
  }

  // Handler for saving the model
  const handleAddModelSave = async () => {
    setAddModelError(null)
    if (!addModelFile) {
      setAddModelError("Please select a .pt model file.")
      return
    }
    if (!addModelFile.name.endsWith(".pt")) {
      setAddModelError("Only .pt files are supported.")
      return
    }
    setAddModelLoading(true)
    try {
      // Save the model using dataAccess.uploadCustomModel
      const now = new Date()
      const model = {
        id: addModelFile.name,
        name: addModelFile.name,
        description: "",
        version: "1.0.0",
        createdAt: now,
        updatedAt: now,
        modelPath: addModelFile.name, // For web, only name is available
        configPath: "",
        modelSize: addModelFile.size,
        isCustom: true,
      }
      await dataAccess.uploadCustomModel(model)
      // Refresh model list
      const models = await dataAccess.getAvailableModels()
      setModels(models)
      setShowAddModelModal(false)
      setAddModelFile(null)
    } catch {
      setAddModelError("Failed to save model.")
    } finally {
      setAddModelLoading(false)
    }
  }

  return (
    <div className="w-full min-h-screen bg-background px-2 sm:px-4 md:px-8 py-4 flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">AI Models</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            variant="default"
            onClick={() => setShowAddModelModal(true)}
            className="w-full sm:w-auto"
          >
            + Add New Model
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowSystemModal(true)}
            className="w-full sm:w-auto"
          >
            <Download className="w-4 h-4 mr-2" />
            Add System Model
          </Button>
        </div>
      </div>
      <Dialog open={showSystemModal} onOpenChange={setShowSystemModal}>
        <DialogContent className="max-w-lg w-full">
          <DialogHeader>
            <DialogTitle>Add System Model</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            {SYSTEM_MODELS.map((model) => (
              <div
                key={model.id}
                className="flex flex-col gap-2 border-b pb-2 last:border-b-0 last:pb-0"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                  <div>
                    <div className="font-semibold text-base">{model.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {model.description}
                    </div>
                  </div>
                  {model.done && (
                    <Button
                      size="sm"
                      disabled
                      variant="secondary"
                      className="w-full sm:w-auto mt-2 sm:mt-0"
                    >
                      Already Added
                    </Button>
                  )}
                </div>
                {model.variants && (
                  <div className="flex flex-col gap-1 pl-0 sm:pl-4">
                    {model.variants.map((variant) => (
                      <div
                        key={variant.name}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                      >
                        <span className="text-xs text-gray-700 dark:text-gray-200">
                          {variant.name}
                        </span>
                        <Button
                          size="sm"
                          className="w-full sm:w-auto"
                          onClick={() =>
                            window.open(variant.downloadUrl, "_blank")
                          }
                        >
                          Download & Use
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {!model.variants && !model.done && (
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => window.open(model.downloadUrl, "_blank")}
                    >
                      Download & Use
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSystemModal(false)}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Add Model Modal */}
      {showAddModelModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70"
          onClick={() => setShowAddModelModal(false)}
        >
          <div
            className="w-full max-w-md rounded-xl p-8 shadow-2xl bg-white dark:bg-gray-800 dark:text-gray-100 flex flex-col relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4"
              onClick={() => setShowAddModelModal(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold mb-4">Add New Model</h2>
            <label className="block mb-2 font-medium">
              Select .pt Model File
            </label>
            <input
              type="file"
              accept=".pt"
              onChange={handleAddModelFileChange}
              className="mb-4"
              disabled={addModelLoading}
            />
            {addModelFile && (
              <div className="mb-2 text-sm text-gray-700 dark:text-gray-200">
                Selected: {addModelFile.name}
              </div>
            )}
            {addModelError && (
              <div className="mb-2 text-sm text-red-500">{addModelError}</div>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setShowAddModelModal(false)}
                disabled={addModelLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddModelSave}
                disabled={addModelLoading || !addModelFile}
              >
                {addModelLoading ? "Saving..." : "Save Model"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {loading && <div>Loading models...</div>}
      {error && <div className="text-red-500">{error}</div>}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {models.length === 0 && (
            <div className="col-span-full text-center text-gray-400 py-8">
              No models found.
            </div>
          )}
          {models.map((model) => (
            <div
              key={model.id}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow p-4 sm:p-5 flex flex-col gap-2 hover:shadow-lg transition-shadow cursor-pointer min-h-[160px]"
              onClick={() => setDetailModel(model)}
              tabIndex={0}
              role="button"
              aria-label={`Show details for ${model.name}`}
            >
              <div className="flex items-center gap-3 mb-2 min-w-0">
                <div className="h-10 w-10 flex items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg shrink-0">
                  {model.name?.[0]?.toUpperCase() || "M"}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="font-semibold text-lg truncate"
                    title={model.name}
                  >
                    {model.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    v{model.version}
                  </div>
                </div>
              </div>
              <div
                className="text-sm text-gray-700 dark:text-gray-300 flex-1 min-h-[40px] truncate"
                title={model.description}
              >
                {model.description}
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="inline-block px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-300">
                  {model.isCustom ? "Custom" : "Built-in"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      <Dialog
        open={!!detailModel}
        onOpenChange={(open) => !open && setDetailModel(null)}
      >
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle>
              {detailModel && detailModel.name
                ? "Model Details"
                : "Add New Model"}
            </DialogTitle>
          </DialogHeader>
          {detailModel && detailModel.name ? (
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-semibold">Name:</span> {detailModel.name}
              </div>
              <div>
                <span className="font-semibold">File Path:</span>{" "}
                {detailModel.modelPath || "-"}
              </div>
              <div>
                <span className="font-semibold">Version:</span>{" "}
                {detailModel.version}
              </div>
              <div>
                <span className="font-semibold">Description:</span>{" "}
                {detailModel.description || "-"}
              </div>
              <div>
                <span className="font-semibold">Created:</span>{" "}
                {detailModel.createdAt
                  ? new Date(detailModel.createdAt).toLocaleString()
                  : "-"}
              </div>
              <div>
                <span className="font-semibold">Custom:</span>{" "}
                {detailModel.isCustom ? "Yes" : "No"}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDetailModel(null)}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
