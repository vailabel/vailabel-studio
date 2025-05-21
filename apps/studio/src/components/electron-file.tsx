import { useRef, useState } from "react"
import { isElectron } from "@/lib/constants"
import { File as FileIcon } from "lucide-react"

interface ElectronFileInputProps {
  onChange: (event: { target: { files: string[] } }) => void
  accept?: string
  multiple?: boolean
  className?: string
  placeholder?: string
}

export function ElectronFileInput({
  onChange,
  accept,
  multiple = false,
  className = "",
  placeholder = "Select file...",
}: ElectronFileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])

  const handleClick = async () => {
    if (isElectron()) {
      const result = await window.ipc.invoke("query:openModelDialog", {
        options: {
          filters: accept
            ? [
                {
                  name: "Accepted Files",
                  extensions: accept.replace(/\./g, "").split(","),
                },
                { name: "All Files", extensions: ["*"] },
              ]
            : undefined,
          properties: [multiple ? "openFile" : "openFile"],
        },
      })
      if (result && result.content) {
        const files = Array.isArray(result.content)
          ? result.content
          : [result.content]
        setSelectedFiles(files)
        onChange({ target: { files } })
      }
    } else {
      inputRef.current?.click()
    }
  }

  const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const fileNames = files.map((f) => f.name)
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
      {/* Hidden input for web fallback */}
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
