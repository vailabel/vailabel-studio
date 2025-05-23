import { useEffect, useState } from "react"
import type { AIModel } from "@vailabel/core/src/models/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, Plus, X } from "lucide-react"
import { useAIModelStore } from "@/hooks/use-ai-model-store"
import { ElectronFileInput } from "@/components/electron-file"

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
  const { getAIModels, aiModels, createAIModel } = useAIModelStore()
  const [showSystemModal, setShowSystemModal] = useState(false)
  const [detailModel, setDetailModel] = useState<AIModel | null>(null)
  const [showAddModelModal, setShowAddModelModal] = useState(false)
  const [addModelFile, setAddModelFile] = useState<File | null>(null)

  // Handler for file input change
  // Accepts { target: { files: string[] } } from ElectronFileInput
  type FileLike = { name: string; path?: string; filePath?: string }
  const handleAddModelFileChange = (event: { target: { files: string[] } }) => {
    if (event.target.files && event.target.files[0]) {
      setAddModelFile({
        name: event.target.files[0],
        path: event.target.files[0],
      } as FileLike as unknown as File)
    } else {
      setAddModelFile(null)
    }
  }

  const handleAddModel = async () => {
    if (addModelFile) {
      const fileLike = addModelFile as unknown as FileLike
      const fileName = fileLike.name
      const filePath = fileLike.path || fileLike.filePath || ""
      const now = new Date()
      const newModel: AIModel = {
        id: Date.now().toString(),
        name: fileName,
        modelPath: filePath,
        version: "1.0",
        description: "Custom model added by user.",
        isCustom: true,
        createdAt: now,
        updatedAt: now,
        configPath: "",
        modelSize: 0,
      }
      await createAIModel(newModel)
      setAddModelFile(null)
      setShowAddModelModal(false)
      await getAIModels()
    }
  }

  const isModelAdded = (fileName: string) => {
    return aiModels.some((m) => m.name === fileName)
  }

  useEffect(() => {
    async function fetchModels() {
      await getAIModels()
    }
    fetchModels()
  }, [getAIModels])

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
            <Plus className="w-4 h-4 mr-2" /> Add New Model
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
            {SYSTEM_MODELS.map((model) => {
              // For models with variants, check each variant; otherwise, check the model name
              const isAdded = model.variants
                ? model.variants.every((v) => isModelAdded(v.name))
                : isModelAdded(model.name)
              return (
                <div
                  key={model.id}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 shadow-sm p-4 flex flex-col gap-2 transition hover:shadow-md hover:bg-gray-100 dark:hover:bg-gray-800/80 mb-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                    <div>
                      <div className="font-semibold text-base flex items-center gap-2">
                        {model.name}
                        {isAdded && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs ml-2">
                            ✓ Added
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {model.description}
                      </div>
                    </div>
                    {isAdded && (
                      <Button
                        size="sm"
                        disabled
                        variant="secondary"
                        className="w-full sm:w-auto mt-2 sm:mt-0 opacity-70 cursor-not-allowed"
                      >
                        Already Added
                      </Button>
                    )}
                  </div>
                  {model.variants && (
                    <div className="flex flex-col gap-1 pl-0 sm:pl-4 mt-2">
                      {model.variants.map((variant) => {
                        const variantAdded = isModelAdded(variant.name)
                        return (
                          <div
                            key={variant.name}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                          >
                            <span className="text-xs text-gray-700 dark:text-gray-200 font-mono">
                              {variant.name}
                              {variantAdded && (
                                <span className="ml-2 text-green-600">
                                  (Added)
                                </span>
                              )}
                            </span>
                            <Button
                              size="sm"
                              className="w-full sm:w-auto bg-primary text-white hover:bg-primary/90"
                              onClick={() =>
                                window.open(variant.downloadUrl, "_blank")
                              }
                              disabled={variantAdded}
                            >
                              <Download className="w-4 h-4 mr-1" /> Download &
                              Use
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {!model.variants && !isAdded && (
                    <div className="flex justify-end mt-2">
                      <Button
                        size="sm"
                        className="w-full sm:w-auto bg-primary text-white hover:bg-primary/90"
                        onClick={() => window.open(model.downloadUrl, "_blank")}
                      >
                        <Download className="w-4 h-4 mr-1" /> Download & Use
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
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
            <ElectronFileInput
              onChange={handleAddModelFileChange}
              accept=".pt"
              placeholder="Select a model file"
              className="mb-4"
            />
            {addModelFile && (
              <div className="mb-2 text-sm text-gray-700 dark:text-gray-200">
                Selected: {addModelFile.name}
              </div>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setShowAddModelModal(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddModel} disabled={!addModelFile}>
                Save Model
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {aiModels.length === 0 && (
          <div className="col-span-full text-center text-gray-400 py-8">
            No models found.
          </div>
        )}
        {aiModels.map((model) => (
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
