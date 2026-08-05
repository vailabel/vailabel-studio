import { memo, useCallback } from "react"
import { Clapperboard, Clock, FileText, Film, ImageIcon, Table2 } from "lucide-react"
import {
  DATA_KIND_LABELS,
  type LabelingTemplate,
} from "@/shared/lib/label-config/labeling-templates"
import type { LabelConfig } from "@/shared/lib/label-config/types"
import type { ModalityDescriptor } from "@/features/projects/model/modality-registry"
import { describeImport } from "@/features/projects/model/import-guide"
import type { useProjectCreateViewModel } from "@/features/projects/model/project-create-viewmodel"
import { Alert, AlertDescription } from "@/shared/ui/alert"
import { FileDropZone } from "@/features/projects/components/file-drop-zone"
import { ImageGrid } from "@/features/projects/components/image-upload"
import { SelectedFileList } from "@/features/projects/components/selected-file-list"
import { useFileDrop } from "@/features/projects/hooks/use-file-drop"
import { ImportGuideCard } from "./import-guide-card"
import { StagedPanel } from "./staged-panel"

type ViewModel = ReturnType<typeof useProjectCreateViewModel>

/** Spreadsheet imports can be huge; only this many rows are listed. */
const ROW_PREVIEW_LIMIT = 200

const plural = (count: number, noun: string) =>
  `${count} ${noun}${count !== 1 ? "s" : ""}`

/** Icon + heading for the staged non-image files, per modality. */
function documentPresentation(descriptor: ModalityDescriptor) {
  const isSpreadsheet = descriptor.importMode === "spreadsheet"
  if (descriptor.kind === "video") {
    return { icon: Clapperboard, rowIcon: FileText, title: "Selected videos", noun: "file" }
  }
  if (isSpreadsheet) {
    return { icon: Table2, rowIcon: Table2, title: "Imported rows", noun: "row" }
  }
  if (descriptor.kind === "audio") {
    return { icon: FileText, rowIcon: FileText, title: "Selected clips", noun: "file" }
  }
  return { icon: FileText, rowIcon: FileText, title: "Selected documents", noun: "file" }
}

/** Step 3 — import the data the chosen template expects. */
export const DataStep = memo(
  ({
    viewModel,
    selectedTemplate,
    descriptor,
    config,
  }: {
    viewModel: ViewModel
    selectedTemplate?: LabelingTemplate
    descriptor?: ModalityDescriptor
    config: LabelConfig | null
  }) => {
    const isImage = descriptor?.kind === "image"
    const isFiles = descriptor?.importMode === "files"
    const isSpreadsheet = descriptor?.importMode === "spreadsheet"

    const handleDrop = useCallback(
      (paths: string[]) => {
        if (!descriptor) return
        const picked = paths.filter(descriptor.accepts)
        if (descriptor.kind === "image") void viewModel.addImagePaths(picked)
        else if (descriptor.importMode === "spreadsheet")
          void viewModel.addSpreadsheetPaths(picked)
        else if (descriptor.importMode === "files")
          void viewModel.addDocumentPaths(picked, descriptor.grantScope)
      },
      [viewModel, descriptor]
    )
    const isOver = useFileDrop(handleDrop, isImage || isFiles || isSpreadsheet)

    // Deferred-import kinds (video): clips are imported inside the studio editor.
    if (descriptor?.importMode === "none") {
      return (
        <div className="mx-auto max-w-2xl">
          <Alert>
            <Film className="size-4" />
            <AlertDescription>
              Create the project, then import and process your video clips in the
              studio — it extracts frames, detects scene cuts, and tracks objects
              across time.
            </AlertDescription>
          </Alert>
        </div>
      )
    }

    // Unsupported kind: a roadmap template with no registered descriptor.
    if (!descriptor) {
      return (
        <div className="mx-auto max-w-2xl">
          <Alert>
            <Clock className="size-4" />
            <AlertDescription>
              {selectedTemplate
                ? `${DATA_KIND_LABELS[selectedTemplate.dataKind]} import isn't available yet — this template is on the roadmap.`
                : "Pick a template first."}
            </AlertDescription>
          </Alert>
        </div>
      )
    }

    const guide = describeImport(descriptor, config)
    const documents = documentPresentation(descriptor)

    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <ImportGuideCard template={selectedTemplate} guide={guide} />

        <FileDropZone
          isOver={isOver}
          busy={viewModel.isScanning}
          onBrowse={() => void viewModel.openImport(descriptor)}
          formats={guide.formats}
        />

        {isImage && viewModel.folderPath && (
          <p className="truncate text-xs text-muted-foreground">
            {viewModel.folderPath}
          </p>
        )}

        {isImage && viewModel.images.length > 0 && (
          <StagedPanel
            icon={ImageIcon}
            title="Selected images"
            count={plural(viewModel.images.length, "file")}
          >
            <ImageGrid images={viewModel.images} onRemove={viewModel.removeImage} />
          </StagedPanel>
        )}

        {(isFiles || isSpreadsheet) && viewModel.documents.length > 0 && (
          <StagedPanel
            icon={documents.icon}
            title={documents.title}
            count={plural(viewModel.documents.length, documents.noun)}
          >
            <SelectedFileList
              files={viewModel.documents}
              icon={documents.rowIcon}
              onRemove={viewModel.removeDocument}
              limit={ROW_PREVIEW_LIMIT}
              scrollable
            />
            {isSpreadsheet && viewModel.documents.length > ROW_PREVIEW_LIMIT && (
              <p className="text-xs text-muted-foreground">
                Showing the first {ROW_PREVIEW_LIMIT} of{" "}
                {viewModel.documents.length} rows.
              </p>
            )}
          </StagedPanel>
        )}
      </div>
    )
  }
)

DataStep.displayName = "DataStep"
