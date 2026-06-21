import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CheckCircle2, Flag, Loader2, Search } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { Input } from "@/shared/ui/input"
import { Button } from "@/shared/ui/button"
import { ScrollArea } from "@/shared/ui/scroll-area"
import { toAssetUrl } from "@/shared/lib/desktop"
import { isImageItem, itemKindIcon } from "@/shared/lib/item-kind"
import type { Item } from "@/shared/types/core"

type StatusFilter = "all" | "annotated" | "unlabeled"

interface FileListPanelProps {
  /** Items loaded SO FAR (the panel pages in more on demand, never all at once). */
  images: Item[]
  currentItemId?: string
  annotatedItemIds: Set<string>
  onSelectItem: (itemId: string) => void
  isLoading?: boolean
  /** Total items in the project (across all pages), for the count + "load more". */
  total?: number
  /** Server-side search box (filters the whole project, not just loaded items). */
  searchValue?: string
  onSearchChange?: (value: string) => void
  /** Whether more pages remain, and how to fetch the next one. */
  hasMore?: boolean
  onLoadMore?: () => void
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
    total,
    searchValue = "",
    onSearchChange,
    hasMore = false,
    onLoadMore,
  }: FileListPanelProps) => {
    const [status, setStatus] = useState<StatusFilter>("all")

    // Search is server-side (whole project); the Done/Todo filter is applied
    // locally to the items loaded so far.
    const visibleImages = useMemo(() => {
      if (status === "all") return images
      return images.filter((image) => {
        const isAnnotated = annotatedItemIds.has(image.id)
        return status === "annotated" ? isAnnotated : !isAnnotated
      })
    }, [images, status, annotatedItemIds])

    const totalCount = total ?? images.length

    // Infinite scroll: auto-load the next page when a sentinel near the bottom
    // scrolls into view, instead of a manual "Load more" click. The observer's
    // root must be the scroll viewport (the list scrolls inside it, not the page).
    const panelRef = useRef<HTMLDivElement>(null)
    const sentinelRef = useRef<HTMLButtonElement>(null)
    useEffect(() => {
      if (!hasMore || !onLoadMore) return
      const viewport = panelRef.current?.querySelector<HTMLElement>(
        '[data-slot="scroll-area-viewport"]'
      )
      const sentinel = sentinelRef.current
      if (!viewport || !sentinel) return
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && !isLoading) onLoadMore()
        },
        { root: viewport, rootMargin: "240px" } // prefetch before the very bottom
      )
      observer.observe(sentinel)
      return () => observer.disconnect()
    }, [hasMore, onLoadMore, isLoading, visibleImages.length])

    return (
      <div
        ref={panelRef}
        className="flex h-full flex-col border-r border-border bg-card text-card-foreground"
      >
        <div className="space-y-2 border-b border-border p-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Files</h2>
            <span className="text-xs text-muted-foreground">
              {isLoading && images.length === 0
                ? "Loading..."
                : `${annotatedItemIds.size}/${totalCount} done`}
            </span>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchValue}
              onChange={(event) => onSearchChange?.(event.target.value)}
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
                : searchValue.trim()
                  ? "No items match your search"
                  : images.length === 0
                    ? "No items in this project"
                    : "No items match the filter"}
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

          {hasMore && (
            // Sentinel: when this scrolls near the viewport bottom the observer
            // loads the next page. Doubles as a click fallback if needed.
            <button
              ref={sentinelRef}
              type="button"
              onClick={() => !isLoading && onLoadMore?.()}
              className="flex w-full items-center justify-center gap-2 p-3 text-xs text-muted-foreground hover:text-foreground"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Loading more…
                </>
              ) : (
                `${images.length} of ${totalCount}`
              )}
            </button>
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

    // Keep the active file in view — on first open (resume), after navigating, or
    // when filtering. `block: "nearest"` only scrolls when it's actually off-screen,
    // so clicking an already-visible item never jumps the list.
    const ref = useRef<HTMLLIElement>(null)
    useEffect(() => {
      if (isActive) ref.current?.scrollIntoView({ block: "nearest" })
    }, [isActive])

    return (
      <li ref={ref}>
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
