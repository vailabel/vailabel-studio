import { memo, useMemo, useCallback } from "react"
import {
  Play,
  Trash2,
  Eye,
  Download,
  Loader2,
} from "lucide-react"
import { Button } from "@/shared/ui/button"
import { Badge } from "@/shared/ui/badge"
import { DataGrid, type DataGridColumn } from "@/shared/components/data-grid"
import type { Item } from "@/shared/types/core"
import { cn } from "@/shared/lib/utils"
import { toAssetUrl } from "@/shared/lib/desktop"
import { iconForKind, itemKind, type ItemKind } from "@/shared/lib/item-kind"

// Types
export interface ImageTableColumn {
  id: string
  name: string
  width: number
  height: number
  /** Modality of the item, so the preview shows the right thumbnail/icon. */
  kind: ItemKind
  createdAt: string | Date | undefined
  updatedAt: string | Date | undefined
  annotationCount: number
  /** Image thumbnail URL; empty for non-image items (they show a kind icon). */
  thumbnail: string
}

export interface ImageTableProps {
  images: Item[]
  isLoading?: boolean
  onImageClick?: (itemId: string) => void
  onImageDelete?: (itemId: string) => void
  onImageDownload?: (itemId: string) => void
  onImagePreview?: (itemId: string) => void
  showActions?: boolean
  showPagination?: boolean
  pageSize?: number
  className?: string
}

export const ImageTable = memo(({
  images,
  isLoading = false,
  onImageClick,
  onImageDelete,
  onImageDownload,
  onImagePreview,
  showActions = true,
  showPagination = true,
  pageSize = 10,
  className,
}: ImageTableProps) => {
  const formatDateValue = useCallback((value: string | Date | undefined) => {
    if (!value) return "Unknown"

    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) {
      return "Unknown"
    }

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date)
  }, [])

  // Transform item data for the grid
  const tableData = useMemo<ImageTableColumn[]>(() => {
    return images.map((image) => {
      const kind = itemKind(image)
      return {
        id: image.id,
        name: image.name,
        width: image.width,
        height: image.height,
        kind,
        createdAt: image.createdAt,
        updatedAt: image.updatedAt,
        annotationCount: image.annotations?.length || 0,
        // Only image items resolve to an on-disk thumbnail; others render an icon.
        thumbnail:
          kind === "image" && image.path
            ? toAssetUrl(image.path)
            : image.url || "",
      }
    })
  }, [images])

  // Define columns
  const columns = useMemo<DataGridColumn<ImageTableColumn>[]>(() => {
    const cols: DataGridColumn<ImageTableColumn>[] = [
      // Preview column — image thumbnail for image items, a modality icon
      // (audio / video / table / document) for everything else.
      {
        id: "thumbnail",
        header: "Preview",
        enableSorting: false,
        cell: ({ row }) => {
          const { kind, thumbnail, name } = row.original
          const KindIcon = iconForKind(kind)
          return (
            <div className="flex items-center justify-center w-16 h-16">
              {kind === "image" && thumbnail ? (
                <img
                  src={thumbnail}
                  alt={name}
                  className="w-12 h-12 object-cover rounded-lg border border-border"
                  loading="lazy"
                />
              ) : (
                <div className="flex w-12 h-12 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                  <KindIcon className="h-5 w-5" />
                </div>
              )}
            </div>
          )
        },
      },

      // Name column
      {
        id: "name",
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => {
          const KindIcon = iconForKind(row.original.kind)
          return (
            <div className="flex items-center gap-2">
              <KindIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="font-medium text-foreground truncate max-w-[200px]">
                {row.original.name}
              </span>
            </div>
          )
        },
      },

      // Dimensions column — only image/video items have pixel dimensions.
      {
        id: "dimensions",
        accessorKey: "width",
        header: "Dimensions",
        cell: ({ row }) =>
          row.original.width > 0 && row.original.height > 0 ? (
            <Badge variant="secondary" className="font-mono text-xs">
              {row.original.width} × {row.original.height}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },

      // Annotations count
      {
        id: "annotations",
        accessorKey: "annotationCount",
        header: "Annotations",
        cell: ({ row }) => (
          <Badge variant={row.original.annotationCount > 0 ? "default" : "secondary"}>
            {row.original.annotationCount}
          </Badge>
        ),
      },

      // Created date
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDateValue(row.original.createdAt)}
          </span>
        ),
      },
    ]

    // Add actions column if enabled
    if (showActions) {
      cols.push({
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            {onImageClick && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onImageClick(row.original.id)}
                className="h-8 w-8 p-0"
              >
                <Play className="h-4 w-4" />
              </Button>
            )}
            {onImagePreview && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onImagePreview(row.original.id)}
                className="h-8 w-8 p-0"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            {onImageDownload && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onImageDownload(row.original.id)}
                className="h-8 w-8 p-0"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            {onImageDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onImageDelete(row.original.id)}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
      })
    }

    return cols
  }, [
    formatDateValue,
    showActions,
    onImageClick,
    onImagePreview,
    onImageDownload,
    onImageDelete,
  ])

  if (isLoading) {
    return (
      <div className={cn("rounded-md border", className)}>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading items...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <DataGrid
      className={className}
      data={tableData}
      columns={columns}
      enablePagination={showPagination}
      pageSize={pageSize}
      searchPlaceholder="Search items..."
      emptyMessage="No items found."
    />
  )
})

ImageTable.displayName = "ImageTable"
