import { memo } from "react"
import {
  AudioLines,
  Code2,
  FileText,
  ImageIcon,
  Info,
  Table2,
  Type,
  UploadCloud,
  Video,
  type LucideIcon,
} from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

interface FileDropZoneProps {
  /** Files are hovering the window (from the native drag-drop event). */
  isOver: boolean
  busy?: boolean
  onBrowse: () => void
}

const FORMAT_GROUPS: { icon: LucideIcon; label: string; exts: string }[] = [
  { icon: ImageIcon, label: "Images", exts: "bmp, gif, jpg, jpeg, png, svg, webp" },
  { icon: AudioLines, label: "Audio", exts: "wav, mp3, flac, m4a, ogg" },
  { icon: Video, label: "Video", exts: "mp4, webm" },
  { icon: Code2, label: "HTML / HyperText", exts: "html, htm, xml" },
  { icon: Type, label: "Text", exts: "txt" },
  { icon: Table2, label: "Structured data", exts: "csv, tsv, json" },
  { icon: FileText, label: "PDF", exts: "pdf" },
]

// Label Studio-style import surface: a drag & drop / click-to-browse area, the
// supported formats, and the cloud-storage caveat.
export const FileDropZone = memo(
  ({ isOver, busy, onBrowse }: FileDropZoneProps) => (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBrowse}
        disabled={busy}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition-colors",
          isOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/50",
          busy && "pointer-events-none opacity-70"
        )}
      >
        {busy ? (
          <Spinner className="size-7 text-muted-foreground" />
        ) : (
          <UploadCloud
            className={cn(
              "size-8",
              isOver ? "text-primary" : "text-muted-foreground"
            )}
          />
        )}
        <p className="text-base font-medium">Drag &amp; drop files here</p>
        <p className="text-sm text-muted-foreground">or click to browse</p>
      </button>

      <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        {FORMAT_GROUPS.map((group) => (
          <div key={group.label} className="flex items-baseline gap-2 text-sm">
            <group.icon className="size-4 shrink-0 translate-y-0.5 text-muted-foreground" />
            <span className="font-medium">{group.label}</span>
            <span className="min-w-0 truncate text-xs text-muted-foreground">
              {group.exts}
            </span>
          </div>
        ))}
      </div>

      <Alert>
        <Info className="size-4" />
        <AlertDescription>
          <span className="font-medium text-foreground">Important:</span> We
          recommend Cloud Storage over direct uploads due to upload limitations.
          For PDFs, use multi-image labeling. JSONL or Parquet (Enterprise only)
          files require cloud storage. Check the documentation to import
          pre-annotated data.
        </AlertDescription>
      </Alert>
    </div>
  )
)

FileDropZone.displayName = "FileDropZone"
