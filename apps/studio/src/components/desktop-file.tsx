import { useRef, useState } from "react"
import { File as FileIcon } from "lucide-react"
import { isDesktopApp, openPathDialog } from "@/lib/desktop"

interface OpenDialogOptions {
  properties?: Array<"openFile" | "multiSelections" | "openDirectory">
  filters?: Array<{
    name: string
    extensions: string[]
  }>
}

interface DesktopFileInputProps {
  onChange: (event: { target: { files: string[] } }) => void
  accept?: string
  multiple?: boolean
  className?: string
  placeholder?: string
  options?: OpenDialogOptions
}

export const DesktopFileInput = ({
  onChange,
  accept,
  multiple = false,
  className = "",
  placeholder = "Select file...",
  options,
}: DesktopFileInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])

  const handleClick = async () => {
    if (isDesktopApp()) {
      const requestOptions = options || {
        properties: multiple ? ["openFile", "multiSelections"] : ["openFile"],
        filters: accept
          ? [{ name: "Files", extensions: accept.split(",") }]
          : [{ name: "All Files", extensions: ["*"] }],
      }

      const files = await openPathDialog({
        directory: requestOptions.properties?.includes("openDirectory"),
        multiple:
          multiple || requestOptions.properties?.includes("multiSelections"),
        filters: requestOptions.filters,
      })

      if (files.length > 0) {
        setSelectedFiles(files)
        onChange({ target: { files } })
      }
      return
    }

    inputRef.current?.click()
  }

  const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const fileNames = files.map((file) => file.name)
    setSelectedFiles(fileNames)
    onChange({ target: { files: fileNames } })
  }

  return (
    <div className={`w-full flex flex-col gap-2 ${className}`}>
      <div
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-primary/60 transition-colors duration-150 cursor-pointer font-semibold text-sm min-h-[40px]"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleClick()}
        role="button"
        aria-label="Select file"
      >
        <FileIcon className="w-4 h-4 text-primary/80" />
        <span className="truncate">
          {selectedFiles.length > 0 ? selectedFiles.join(", ") : placeholder}
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={handleNativeChange}
        tabIndex={-1}
      />
    </div>
  )
}
