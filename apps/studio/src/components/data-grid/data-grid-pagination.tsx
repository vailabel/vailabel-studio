// Presentational pagination control shared by `DataGrid` (client) and
// `ServerDataGrid` (server). It is intentionally dumb: it takes plain numbers
// plus change callbacks, so each grid can feed it either react-table state or
// controlled server props.

import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { DEFAULT_PAGE_SIZE_OPTIONS } from "./types";

export interface DataGridPaginationProps {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    pageSize: number;
    isLoading?: boolean;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
    pageSizeOptions?: number[];
}

function getPageWindow(currentPage: number, totalPages: number, maxPagesToShow = 5): number[] {
    const halfRange = Math.floor(maxPagesToShow / 2);
    let startPage = Math.max(1, currentPage - halfRange);
    const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    startPage = Math.max(1, endPage - maxPagesToShow + 1);

    const pages: number[] = [];
    for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
    }
    return pages;
}

export function DataGridPagination({
    currentPage,
    totalPages,
    totalCount,
    pageSize,
    isLoading = false,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: DataGridPaginationProps) {
    if (totalPages <= 1) return null;

    const startRecord = (currentPage - 1) * pageSize + 1;
    const endRecord = Math.min(currentPage * pageSize, totalCount);
    const isFirstPage = currentPage <= 1;
    const isLastPage = currentPage >= totalPages;

    return (
        <div className="flex items-center justify-between">
            {/* Records info */}
            <div className="text-sm text-muted-foreground">
                <span>
                    Showing <span className="font-medium text-foreground">{startRecord}</span> to{" "}
                    <span className="font-medium text-foreground">{endRecord}</span> of{" "}
                    <span className="font-medium text-foreground">{totalCount.toLocaleString()}</span>
                </span>
            </div>

            {/* Pagination controls */}
            <div className="flex items-center space-x-1">
                {/* First page */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(1)}
                    disabled={isFirstPage || isLoading}
                    className="h-7 w-7 p-0"
                >
                    <ChevronsLeft className="h-3 w-3" />
                </Button>

                {/* Previous page */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={isFirstPage || isLoading}
                    className="h-7 px-2"
                >
                    <ChevronLeft className="h-3 w-3" />
                    <span className="hidden sm:inline ml-1 text-xs">Prev</span>
                </Button>

                {/* Page numbers */}
                <div className="flex items-center space-x-1">
                    {getPageWindow(currentPage, totalPages).map((page) => (
                        <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => onPageChange(page)}
                            disabled={isLoading}
                            className="h-7 w-7 p-0 text-xs"
                        >
                            {page}
                        </Button>
                    ))}
                </div>

                {/* Next page */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={isLastPage || isLoading}
                    className="h-7 px-2"
                >
                    <span className="hidden sm:inline mr-1 text-xs">Next</span>
                    <ChevronRight className="h-3 w-3" />
                </Button>

                {/* Last page */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(totalPages)}
                    disabled={isLastPage || isLoading}
                    className="h-7 w-7 p-0"
                >
                    <ChevronsRight className="h-3 w-3" />
                </Button>
            </div>

            {/* Page size selector */}
            <div className="flex items-center space-x-2">
                <span className="text-xs text-muted-foreground">Show</span>
                <Select
                    value={pageSize.toString()}
                    onValueChange={(value: string) => onPageSizeChange(parseInt(value))}
                >
                    <SelectTrigger className="w-16 h-7 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {pageSizeOptions.map((size) => (
                            <SelectItem key={size} value={size.toString()}>
                                {size}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}

export default DataGridPagination;
