import { memo, useEffect, useMemo, useState } from "react"
import { FolderOpen, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/ui/dialog"
import { Button } from "@/shared/ui/button"
import { cn } from "@/shared/lib/utils"
import { exportFormatsFor, type ExportFormat } from "@/features/studio/model/lib/export"
import type { Modality, Task } from "@/shared/types/modality"
import { toErrorMessage } from "@/shared/lib/errors"

interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
  onExport: (
    format: ExportFormat
  ) => Promise<{ count: number; outputDir: string } | null>
  isExporting: boolean
  /** Project modality + task — pick the applicable export formats. */
  modality?: Modality
  task?: Task
}

export const ExportDialog = memo(
  ({
    isOpen,
    onClose,
    onExport,
    isExporting,
    modality,
    task,
  }: ExportDialogProps) => {
    const formats = useMemo(
      () => exportFormatsFor(modality, task),
      [modality, task]
    )
    const [format, setFormat] = useState<ExportFormat | null>(
      () => exportFormatsFor(modality, task)[0]?.id ?? null
    )

    // Keep the selection valid when the modality/task (and thus the format
    // list) resolves after the dialog has mounted.
    useEffect(() => {
      if (!formats.some((meta) => meta.id === format)) {
        setFormat(formats[0]?.id ?? null)
      }
    }, [formats, format])

    const handleExport = async () => {
      if (!format) return
      try {
        const result = await onExport(format)
        if (!result) return // cancelled folder picker
        toast(`Exported ${result.count} file${result.count === 1 ? "" : "s"}`, {
          description: result.outputDir,
        })
        onClose()
      } catch (error) {
        toast.error("Export failed", {
          description:
            toErrorMessage(error, "An unknown error occurred."),
        })
      }
    }

    return (
      <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Export Dataset</DialogTitle>
            <DialogDescription>
              Choose a format, then pick an output folder. Only annotation files
              are written — images stay where they are.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {formats.length === 0 && (
              <p className="rounded-lg border p-3 text-sm text-muted-foreground">
                No export formats are available for this project type.
              </p>
            )}
            {formats.map((meta) => (
              <button
                key={meta.id}
                type="button"
                onClick={() => setFormat(meta.id)}
                className={cn(
                  "flex w-full flex-col items-start rounded-lg border p-3 text-left transition-colors",
                  format === meta.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                    : "hover:bg-muted/50"
                )}
              >
                <span className="text-sm font-medium">{meta.label}</span>
                <span className="text-xs text-muted-foreground">
                  {meta.description}
                </span>
              </button>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isExporting}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleExport()}
              disabled={isExporting || !format}
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Choose Folder & Export
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }
)

ExportDialog.displayName = "ExportDialog"
