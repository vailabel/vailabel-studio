// Server-driven DataGrid: pagination, sorting and filtering are *controlled* by
// the parent. `data` holds only the current page's rows; the grid emits
// onPageChange / onSortChange / onFilterChange and renders whatever it's given.
// For fully in-memory tables, use the client `DataGrid` instead.

import {
    useReactTable,
    getCoreRowModel,
    type ColumnDef,
} from "@tanstack/react-table";
import { DataGridShell } from "./data-grid-shell";
import { DataGridPagination } from "./data-grid-pagination";
import { type DataGridBaseProps, type SortDirection } from "./types";

export interface ServerPagination {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
}

export interface ServerSorting {
    sortBy?: string;
    sortDirection?: SortDirection;
    onSortChange: (sortBy: string, sortDirection: SortDirection) => void;
}

export interface ServerFiltering {
    filters?: Record<string, unknown>;
    onFilterChange: (filters: Record<string, unknown>) => void;
}

export interface ServerDataGridProps<T> extends DataGridBaseProps<T> {
    /** Server pagination state + callbacks. Omit to hide pagination. */
    pagination?: ServerPagination;
    /** Server sorting state + callback. Omit to disable header sorting. */
    sorting?: ServerSorting;
    /** Server filtering state + callback (consumed by `filterComponent`). */
    filtering?: ServerFiltering;
}

export function ServerDataGrid<T>({
    data,
    columns,
    title,
    emptyMessage = "No data found.",
    className = "",
    variant = "default",
    enableSorting = true,
    enableSearch = true,
    enableExport = false,
    enablePagination = true,
    onRowClick,
    onExport,
    searchPlaceholder = "Search...",
    searchValue = "",
    onSearchChange,
    isLoading = false,
    filterComponent,
    actionComponent,
    aggregations,
    showAggregations = true,
    pageSizeOptions,
    pagination,
    sorting,
}: ServerDataGridProps<T>) {
    // The grid is purely controlled here: react-table only provides the core
    // row model for rendering. Pagination/sorting/filtering are all manual.
    const table = useReactTable({
        data,
        columns: columns as ColumnDef<T>[],
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        manualSorting: true,
        manualFiltering: true,
        pageCount: pagination?.totalPages ?? -1,
    });

    const canSort = (columnId: string): boolean => {
        if (!sorting) return false;
        const column = columns.find((col) => col.id === columnId);
        return column?.meta?.sorting?.backendSortable !== false;
    };

    const handleSort = (columnId: string) => {
        if (!sorting) return;
        const current = sorting.sortBy === columnId ? sorting.sortDirection : undefined;
        const nextDirection: SortDirection = current === "asc" ? "desc" : "asc";
        sorting.onSortChange(columnId, nextDirection);
    };

    const paginationNode =
        enablePagination && pagination ? (
            <DataGridPagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalCount={pagination.totalCount}
                pageSize={pagination.pageSize}
                isLoading={isLoading}
                onPageChange={pagination.onPageChange}
                onPageSizeChange={pagination.onPageSizeChange}
                pageSizeOptions={pageSizeOptions}
            />
        ) : null;

    return (
        <DataGridShell
            table={table}
            columns={columns}
            title={title}
            emptyMessage={emptyMessage}
            className={className}
            variant={variant}
            enableSorting={enableSorting && !!sorting}
            enableSearch={enableSearch}
            enableExport={enableExport}
            onRowClick={onRowClick}
            onExport={onExport}
            searchPlaceholder={searchPlaceholder}
            searchValue={searchValue}
            onSearchChange={onSearchChange}
            filterComponent={filterComponent}
            actionComponent={actionComponent}
            aggregations={aggregations}
            showAggregations={showAggregations}
            sortMode="backend"
            canSort={canSort}
            getSortState={(columnId) =>
                sorting?.sortBy === columnId ? sorting.sortDirection ?? false : false
            }
            onSort={handleSort}
            pagination={paginationNode}
        />
    );
}

export default ServerDataGrid;
