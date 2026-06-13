import { memo, useState } from "react"
import { FolderOpen, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { EXPORT_FORMATS, type ExportFormat } from "@/lib/export"

interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
  onExport: (
    format: ExportFormat
  ) => Promise<{ count: number; outputDir: string } | null>
  isExporting: boolean
}

export const ExportDialog = memo(
  ({ isOpen, onClose, onExport, isExporting }: ExportDialogProps) => {
    const [format, setFormat] = useState<ExportFormat>("labelme")

    const handleExport = async () => {
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
            error instanceof Error ? error.message : "An unknown error occurred.",
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
            {EXPORT_FORMATS.map((meta) => (
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
            <Button onClick={() => void handleExport()} disabled={isExporting}>
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
