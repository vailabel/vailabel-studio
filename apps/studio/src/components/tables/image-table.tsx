import { memo, useMemo, useCallback } from "react"
import {
  ImageIcon,
  Play,
  Trash2,
  Eye,
  Download,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataGrid, type DataGridColumn } from "@/components/data-grid"
import type { ImageData } from "@/types/core"
import { cn } from "@/lib/utils"
import { toAssetUrl } from "@/lib/desktop"

// Types
export interface ImageTableColumn {
  id: string
  name: string
  width: number
  height: number
  createdAt: string | Date | undefined
  updatedAt: string | Date | undefined
  annotationCount: number
  thumbnail: string
}

export interface ImageTableProps {
  images: ImageData[]
  isLoading?: boolean
  onImageClick?: (imageId: string) => void
  onImageDelete?: (imageId: string) => void
  onImageDownload?: (imageId: string) => void
  onImagePreview?: (imageId: string) => void
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

  // Transform images data for the grid
  const tableData = useMemo<ImageTableColumn[]>(() => {
    return images.map((image) => ({
      id: image.id,
      name: image.name,
      width: image.width,
      height: image.height,
      createdAt: image.createdAt,
      updatedAt: image.updatedAt,
      annotationCount: image.annotations?.length || 0,
      thumbnail: image.path
        ? toAssetUrl(image.path)
        : image.url || "/placeholder.svg",
    }))
  }, [images])

  // Define columns
  const columns = useMemo<DataGridColumn<ImageTableColumn>[]>(() => {
    const cols: DataGridColumn<ImageTableColumn>[] = [
      // Thumbnail column
      {
        id: "thumbnail",
        header: "Preview",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-center w-16 h-16">
            <img
              src={row.original.thumbnail}
              alt={row.original.name}
              className="w-12 h-12 object-cover rounded-lg border border-border"
              loading="lazy"
            />
          </div>
        ),
      },

      // Name column
      {
        id: "name",
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-foreground dark:text-white truncate max-w-[200px]">
              {row.original.name}
            </span>
          </div>
        ),
      },

      // Dimensions column
      {
        id: "dimensions",
        accessorKey: "width",
        header: "Dimensions",
        cell: ({ row }) => (
          <Badge variant="secondary" className="font-mono text-xs">
            {row.original.width} × {row.original.height}
          </Badge>
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
                className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
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
            <p className="text-muted-foreground">Loading images...</p>
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
      searchPlaceholder="Search images..."
      emptyMessage="No images found."
    />
  )
})

ImageTable.displayName = "ImageTable"
