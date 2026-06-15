// Client-side DataGrid: sorting, filtering and pagination are all handled
// in-memory by react-table. Hand it the full dataset and it does the rest.
// For server-driven data (controlled page/sort/filter), use `ServerDataGrid`.

import { useState } from "react";
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    type ColumnDef,
    type SortingState,
} from "@tanstack/react-table";
import { DataGridShell } from "./data-grid-shell";
import { DataGridPagination } from "./data-grid-pagination";
import { type DataGridBaseProps } from "./types";

export interface DataGridProps<T> extends DataGridBaseProps<T> {
    /** Initial page size. Defaults to 10. */
    pageSize?: number;
}

export function DataGrid<T>({
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
    pageSize = 10,
    searchPlaceholder = "Search...",
    searchValue,
    onSearchChange,
    isLoading = false,
    filterComponent,
    actionComponent,
    aggregations,
    showAggregations = true,
    pageSizeOptions,
}: DataGridProps<T>) {
    const [sorting, setSorting] = useState<SortingState>([]);
    // When the search input is uncontrolled, the grid filters in-memory via
    // react-table's global filter. A `searchValue` prop switches it to
    // controlled mode (the parent owns filtering).
    const isControlledSearch = searchValue !== undefined;
    const [globalFilter, setGlobalFilter] = useState("");

    const table = useReactTable({
        data,
        columns: columns as ColumnDef<T>[],
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
        getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
        onSortingChange: setSorting,
        onGlobalFilterChange: isControlledSearch ? undefined : setGlobalFilter,
        state: {
            sorting,
            globalFilter: isControlledSearch ? undefined : globalFilter,
        },
        initialState: {
            pagination: enablePagination ? { pageSize } : undefined,
        },
    });

    const canSort = (columnId: string): boolean => {
        const column = columns.find((col) => col.id === columnId);
        if (column?.meta?.sorting?.frontendSortable === false) return false;
        return table.getColumn(columnId)?.getCanSort() ?? false;
    };

    const pagination = enablePagination ? (
        <DataGridPagination
            currentPage={table.getState().pagination.pageIndex + 1}
            totalPages={table.getPageCount()}
            totalCount={table.getFilteredRowModel().rows.length}
            pageSize={table.getState().pagination.pageSize}
            isLoading={isLoading}
            onPageChange={(page) => table.setPageIndex(page - 1)}
            onPageSizeChange={(size) => table.setPageSize(size)}
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
            enableSorting={enableSorting}
            enableSearch={enableSearch}
            enableExport={enableExport}
            onRowClick={onRowClick}
            onExport={onExport}
            searchPlaceholder={searchPlaceholder}
            searchValue={isControlledSearch ? searchValue! : globalFilter}
            onSearchChange={(value) => {
                if (!isControlledSearch) setGlobalFilter(value);
                onSearchChange?.(value);
            }}
            filterComponent={filterComponent}
            actionComponent={actionComponent}
            aggregations={aggregations}
            showAggregations={showAggregations}
            sortMode="frontend"
            canSort={canSort}
            getSortState={(columnId) => {
                const sorted = table.getColumn(columnId)?.getIsSorted();
                return sorted === false ? false : sorted ?? false;
            }}
            onSort={(columnId) => table.getColumn(columnId)?.toggleSorting()}
            pagination={pagination}
        />
    );
}

export default DataGrid;
