import { FolderOpen, Plus } from "lucide-react"
import type { Item as ProjectItem } from "@/shared/types/core"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { Spinner } from "@/shared/ui/spinner"
import { ImageGrid } from "@/features/projects/components/image-upload"

/** Folder-based image import (the default `image` modality). */
export function ImageImportPanel({
  images,
  isUploading,
  isSaving,
  onOpenFolder,
  onRemove,
  onSave,
}: {
  images: ProjectItem[]
  isUploading: boolean
  isSaving: boolean
  onOpenFolder: () => void
  onRemove: (index: number) => void
  onSave: () => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Add images</h3>
        <Badge variant="secondary">{images.length} selected</Badge>
      </div>

      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={onOpenFolder}
        disabled={isUploading}
      >
        {isUploading ? <Spinner /> : <FolderOpen className="size-5" />}
        {isUploading ? "Scanning folder…" : "Open image folder"}
      </Button>

      <ImageGrid images={images} onRemove={onRemove} />

      {images.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={onSave} disabled={isUploading || isSaving}>
            {isSaving ? <Spinner /> : <Plus />}
            {isSaving
              ? "Saving images…"
              : `Save ${images.length} image${images.length !== 1 ? "s" : ""}`}
          </Button>
        </div>
      )}
    </div>
  )
}
