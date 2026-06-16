import { useRef, useState } from "react"
import { File as FileIcon } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/ui/button"
import { isDesktopApp, openPathDialog } from "@/shared/lib/desktop"

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
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={handleClick}
        aria-label="Select file"
        className="w-full justify-start font-semibold"
      >
        <FileIcon className="text-primary/80" />
        <span className="truncate">
          {selectedFiles.length > 0 ? selectedFiles.join(", ") : placeholder}
        </span>
      </Button>
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
