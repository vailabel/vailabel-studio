import { memo, useMemo, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type PaginationState,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  ImageIcon,
  Play,
  Trash2,
  Eye,
  Download,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ImageData } from "@vailabel/core"
import { cn } from "@/lib/utils"

// Types
export interface ImageTableColumn {
  id: string
  name: string
  width: number
  height: number
  createdAt: Date | undefined
  updatedAt: Date | undefined
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
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  })

  // Transform images data for table
  const tableData = useMemo(() => {
    return images.map((image) => ({
      id: image.id,
      name: image.name,
      width: image.width,
      height: image.height,
      createdAt: image.createdAt,
      updatedAt: image.updatedAt,
      annotationCount: image.annotations?.length || 0,
      thumbnail: image.data || image.url || "/placeholder.svg",
    }))
  }, [images])

  // Define columns
  const columns = useMemo(() => {
    const cols: ColumnDef<ImageTableColumn>[] = [
      // Thumbnail column
      {
        id: "thumbnail",
        header: "Preview",
        cell: ({ row }) => (
          <div className="flex items-center justify-center w-16 h-16">
            <div className="relative group">
              <img
                src={row.original.thumbnail}
                alt={row.original.name}
                className="w-12 h-12 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ opacity: 1, scale: 1 }}
                  className="bg-white/90 dark:bg-gray-800/90 rounded-full p-1"
                >
                  <Eye className="h-3 w-3 text-gray-700 dark:text-gray-300" />
                </motion.div>
              </div>
            </div>
          </div>
        ),
        enableSorting: false,
        enableColumnFilter: false,
      },

      // Name column
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2 lg:px-3"
          >
            Name
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-gray-500" />
            <span className="font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
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
        enableSorting: true,
        enableColumnFilter: false,
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
        enableSorting: true,
        enableColumnFilter: false,
      },

      // Created date
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2 lg:px-3"
          >
            Created
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {row.original.createdAt
              ? new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }).format(row.original.createdAt)
              : "Unknown"}
          </span>
        ),
      },
    ]

    // Add actions column if enabled
    if (showActions) {
      cols.push({
        id: "actions",
        header: "Actions",
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
        enableSorting: false,
        enableColumnFilter: false,
      })
    }

    return cols
  }, [showActions, onImageClick, onImagePreview, onImageDownload, onImageDelete])

  // Create table instance
  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      pagination,
    },
  })

  // Pagination handlers
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPagination(prev => ({ ...prev, pageSize: newPageSize, pageIndex: 0 }))
  }, [])

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-gray-600 dark:text-gray-400">Loading images...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Images ({table.getFilteredRowModel().rows.length})
          </CardTitle>
          
          {/* Global filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search images..."
                value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                onChange={(event) =>
                  table.getColumn("name")?.setFilterValue(event.target.value)
                }
                className="pl-10 w-64"
              />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 dark:border-gray-700">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              <AnimatePresence>
                {table.getRowModel().rows.map((row, index) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {showPagination && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                  table.getFilteredRowModel().rows.length
                )}{" "}
                of {table.getFilteredRowModel().rows.length} results
              </span>
              
              <select
                value={table.getState().pagination.pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="ml-2 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
              >
                {[5, 10, 20, 30, 40, 50].map((pageSize) => (
                  <option key={pageSize} value={pageSize}>
                    {pageSize} per page
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                className="h-8 w-8 p-0"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 text-sm text-gray-600 dark:text-gray-400">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
                className="h-8 w-8 p-0"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
})

ImageTable.displayName = "ImageTable"
