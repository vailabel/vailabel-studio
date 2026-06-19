import { memo, useCallback, useMemo, useState } from "react"
import { CheckCircle2, Flag, Search } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { Input } from "@/shared/ui/input"
import { Button } from "@/shared/ui/button"
import { ScrollArea } from "@/shared/ui/scroll-area"
import { toAssetUrl } from "@/shared/lib/desktop"
import { isImageItem, itemKindIcon } from "@/shared/lib/item-kind"
import type { Item } from "@/shared/types/core"

type StatusFilter = "all" | "annotated" | "unlabeled"

interface FileListPanelProps {
  images: Item[]
  currentItemId?: string
  annotatedItemIds: Set<string>
  onSelectItem: (itemId: string) => void
  isLoading?: boolean
}

function hasFlags(image: Item) {
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
    currentItemId,
    annotatedItemIds,
    onSelectItem,
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
        const isAnnotated = annotatedItemIds.has(image.id)
        if (status === "annotated") return isAnnotated
        if (status === "unlabeled") return !isAnnotated
        return true
      })
    }, [images, query, status, annotatedItemIds])

    return (
      <div className="flex h-full flex-col border-r border-border bg-card text-card-foreground">
        <div className="space-y-2 border-b border-border p-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Files</h2>
            <span className="text-xs text-muted-foreground">
              {isLoading
                ? "Loading..."
                : `${annotatedItemIds.size}/${images.length} done`}
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
                ? "Loading items..."
                : images.length === 0
                  ? "No items in this project"
                  : "No files match the filter"}
            </p>
          ) : (
            <ul className="p-2">
              {visibleImages.map((image) => (
                <FileListItem
                  key={image.id}
                  image={image}
                  isActive={image.id === currentItemId}
                  isAnnotated={annotatedItemIds.has(image.id)}
                  onSelect={onSelectItem}
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
    image: Item
    isActive: boolean
    isAnnotated: boolean
    onSelect: (itemId: string) => void
  }) => {
    const handleClick = useCallback(() => onSelect(image.id), [image.id, onSelect])
    const KindIcon = itemKindIcon(image)

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
            {image.path && isImageItem(image) ? (
              <img
                src={toAssetUrl(image.path)}
                alt={image.name}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <KindIcon className="m-2.5 h-5 w-5 text-muted-foreground" />
            )}
          </div>

          <span className="min-w-0 flex-1 truncate text-sm" title={image.name}>
            {image.name}
          </span>

          {hasFlags(image) && (
            <Flag className="h-4 w-4 flex-shrink-0 text-warning" />
          )}
          {isAnnotated && (
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-success" />
          )}
        </button>
      </li>
    )
  }
)

FileListItem.displayName = "FileListItem"
