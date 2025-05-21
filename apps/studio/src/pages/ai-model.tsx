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
import { Download } from "lucide-react"

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
  const dataAccess = useDataAccess()
  const [models, setModels] = useState<AIModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSystemModal, setShowSystemModal] = useState(false)
  const [detailModel, setDetailModel] = useState<AIModel | null>(null)

  useEffect(() => {
    setLoading(true)
    dataAccess
      .getAvailableModels()
      .then(setModels)
      .catch((e) => setError(e.message || "Failed to load models"))
      .finally(() => setLoading(false))
  }, [dataAccess])

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">AI Models</h1>
        <Button variant="outline" onClick={() => setShowSystemModal(true)}>
          <Download className="w-4 h-4 mr-2" />
          Add System Model
        </Button>
      </div>
      <Dialog open={showSystemModal} onOpenChange={setShowSystemModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add System Model</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            {SYSTEM_MODELS.map((model) => (
              <div
                key={model.id}
                className="flex flex-col gap-2 border-b pb-2 last:border-b-0 last:pb-0"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-base">{model.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {model.description}
                    </div>
                  </div>
                  {model.done && (
                    <Button size="sm" disabled variant="secondary">
                      Already Added
                    </Button>
                  )}
                </div>
                {model.variants && (
                  <div className="flex flex-col gap-1 pl-4">
                    {model.variants.map((variant) => (
                      <div
                        key={variant.name}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="text-xs text-gray-700 dark:text-gray-200">
                          {variant.name}
                        </span>
                        <Button
                          size="sm"
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
            <Button variant="outline" onClick={() => setShowSystemModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow p-5 flex flex-col gap-2 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setDetailModel(model)}
              tabIndex={0}
              role="button"
              aria-label={`Show details for ${model.name}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 flex items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
                  {model.name?.[0]?.toUpperCase() || "M"}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-lg">{model.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    v{model.version}
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 flex-1 min-h-[40px]">
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Model Details</DialogTitle>
          </DialogHeader>
          {detailModel && (
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
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailModel(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
