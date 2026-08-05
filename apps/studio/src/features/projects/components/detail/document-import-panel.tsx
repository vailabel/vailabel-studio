import { FileText, Plus } from "lucide-react"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { Spinner } from "@/shared/ui/spinner"
import {
  SelectedFileList,
  type SelectedFile,
} from "@/features/projects/components/selected-file-list"

/** File-picker import for the non-image modalities (text, audio, …). */
export function DocumentImportPanel({
  documents,
  kindLabel,
  fileLabel,
  isUploading,
  isSaving,
  onSelectFiles,
  onRemove,
  onSave,
}: {
  documents: SelectedFile[]
  /** Human name of the modality, e.g. "Text". */
  kindLabel: string
  /** Unit noun for this modality, e.g. "clips" or "files". */
  fileLabel: string
  isUploading: boolean
  isSaving: boolean
  onSelectFiles: () => void
  onRemove: (index: number) => void
  onSave: () => void
}) {
  const kind = kindLabel.toLowerCase()

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">
          Add {kind} {fileLabel}
        </h3>
        <Badge variant="secondary">{documents.length} selected</Badge>
      </div>

      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={onSelectFiles}
        disabled={isUploading}
      >
        {isUploading ? <Spinner /> : <FileText className="size-5" />}
        {isUploading ? "Opening…" : `Select ${kind} ${fileLabel}`}
      </Button>

      {documents.length > 0 && (
        <>
          <SelectedFileList
            files={documents}
            icon={FileText}
            onRemove={onRemove}
          />
          <div className="flex justify-end">
            <Button onClick={onSave} disabled={isUploading || isSaving}>
              {isSaving ? <Spinner /> : <Plus />}
              {isSaving
                ? `Saving ${fileLabel}…`
                : `Save ${documents.length} ${fileLabel}`}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
