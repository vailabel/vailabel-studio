import { memo, useCallback, useMemo, useState } from "react"
import { CheckCircle2, Flag, ImageIcon, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toAssetUrl } from "@/lib/desktop"
import type { ImageData } from "@/types/core"

type StatusFilter = "all" | "annotated" | "unlabeled"

interface FileListPanelProps {
  images: ImageData[]
  currentImageId?: string
  annotatedImageIds: Set<string>
  onSelectImage: (imageId: string) => void
  isLoading?: boolean
}

function hasFlags(image: ImageData) {
  return Object.values(image.flags || {}).some(Boolean)
}

const STATUS_FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "annotated", label: "Done" },
  { id: "unlabeled", label: "Todo" },
]

export const FileListPanel = memo(
  ({
    images,
    currentImageId,
    annotatedImageIds,
    onSelectImage,
    isLoading = false,
  }: FileListPanelProps) => {
    const [query, setQuery] = useState("")
    const [status, setStatus] = useState<StatusFilter>("all")

    const visibleImages = useMemo(() => {
      const normalizedQuery = query.trim().toLowerCase()
      return images.filter((image) => {
        const matchesQuery =
          !normalizedQuery || image.name.toLowerCase().includes(normalizedQuery)
        if (!matchesQuery) return false
        const isAnnotated = annotatedImageIds.has(image.id)
        if (status === "annotated") return isAnnotated
        if (status === "unlabeled") return !isAnnotated
        return true
      })
    }, [images, query, status, annotatedImageIds])

    return (
      <div className="flex h-full flex-col border-r border-border bg-card text-card-foreground">
        <div className="space-y-2 border-b border-border p-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Files</h2>
            <span className="text-xs text-muted-foreground">
              {isLoading
                ? "Loading..."
                : `${annotatedImageIds.size}/${images.length} done`}
            </span>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search files"
              className="h-8 pl-8"
            />
          </div>

          <div className="flex gap-1">
            {STATUS_FILTERS.map((option) => (
              <Button
                key={option.id}
                type="button"
                size="sm"
                variant={status === option.id ? "secondary" : "ghost"}
                className="h-7 flex-1 px-2 text-xs"
                onClick={() => setStatus(option.id)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          {visibleImages.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {isLoading
                ? "Loading images..."
                : images.length === 0
                  ? "No images in this project"
                  : "No files match the filter"}
            </p>
          ) : (
            <ul className="p-2">
              {visibleImages.map((image) => (
                <FileListItem
                  key={image.id}
                  image={image}
                  isActive={image.id === currentImageId}
                  isAnnotated={annotatedImageIds.has(image.id)}
                  onSelect={onSelectImage}
                />
              ))}
            </ul>
          )}
        </ScrollArea>
      </div>
    )
  }
)

FileListPanel.displayName = "FileListPanel"

const FileListItem = memo(
  ({
    image,
    isActive,
    isAnnotated,
    onSelect,
  }: {
    image: ImageData
    isActive: boolean
    isAnnotated: boolean
    onSelect: (imageId: string) => void
  }) => {
    const handleClick = useCallback(() => onSelect(image.id), [image.id, onSelect])

    return (
      <li>
        <button
          type="button"
          onClick={handleClick}
          className={cn(
            "flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors",
            isActive
              ? "bg-accent text-accent-foreground ring-1 ring-primary/40"
              : "hover:bg-accent/50"
          )}
        >
          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded border border-border bg-muted">
            {image.path ? (
              <img
                src={toAssetUrl(image.path)}
                alt={image.name}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <ImageIcon className="m-2.5 h-5 w-5 text-muted-foreground" />
            )}
          </div>

          <span className="min-w-0 flex-1 truncate text-sm" title={image.name}>
            {image.name}
          </span>

          {hasFlags(image) && (
            <Flag className="h-4 w-4 flex-shrink-0 text-amber-500" />
          )}
          {isAnnotated && (
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500" />
          )}
        </button>
      </li>
    )
  }
)

FileListItem.displayName = "FileListItem"
