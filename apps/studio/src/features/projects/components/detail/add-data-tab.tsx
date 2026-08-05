import type { DatasetImportFormat } from "@/shared/types/ai-runtime"
import type { DataKind } from "@/shared/lib/label-config/labeling-templates"
import { descriptorForKind } from "@/features/projects/model/modality-registry"
import type { useProjectDetailViewModel } from "@/features/projects/model/project-detail-viewmodel"
import { DatasetImportCard } from "@/features/projects/components/dataset-import-card"
import { DocumentImportPanel } from "./document-import-panel"
import { ImageImportPanel } from "./image-import-panel"
import { TabHeading } from "./tab-heading"

type ViewModel = ReturnType<typeof useProjectDetailViewModel>

/**
 * Upload tab. The project's modality decides which importer is shown: image
 * projects pick a folder (and can additionally import an annotated dataset),
 * every other kind picks individual files.
 */
export function AddDataTab({
  viewModel,
  modality,
  onImportDataset,
}: {
  viewModel: ViewModel
  modality: DataKind
  onImportDataset: (format?: DatasetImportFormat) => void
}) {
  const descriptor = descriptorForKind(modality)
  // No descriptor means an unregistered kind; fall back to the folder importer.
  const isImageModality = !descriptor || descriptor.importMode === "folder"

  return (
    <>
      <TabHeading
        title="Add data"
        description="Bring your media into this project, and optionally import existing annotations. Files are referenced in place — nothing is copied."
      />

      <div className="flex flex-col gap-4">
        {isImageModality ? (
          <ImageImportPanel
            images={viewModel.newImages}
            isUploading={viewModel.isUploading}
            isSaving={viewModel.isSaving}
            onOpenFolder={viewModel.addImagesFromFolder}
            onRemove={viewModel.handleRemoveImage}
            onSave={viewModel.saveImages}
          />
        ) : (
          <DocumentImportPanel
            documents={viewModel.newDocuments}
            kindLabel={descriptor.label}
            fileLabel={modality === "audio" ? "clips" : "files"}
            isUploading={viewModel.isUploading}
            isSaving={viewModel.isSaving}
            onSelectFiles={() =>
              void viewModel.addDocumentFiles(descriptor.extensions)
            }
            onRemove={viewModel.handleRemoveDocument}
            onSave={() => void viewModel.saveDocuments()}
          />
        )}

        {isImageModality && (
          <DatasetImportCard
            isImporting={viewModel.isImporting}
            onImport={onImportDataset}
          />
        )}
      </div>
    </>
  )
}
