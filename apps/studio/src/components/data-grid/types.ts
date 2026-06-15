// Shared types for the DataGrid family (client `DataGrid` + `ServerDataGrid`).
// Both grids render through the same presentational shell, so the column and
// presentational prop shapes live here to stay in sync.

import type React from "react";
import type { ColumnDef } from "@tanstack/react-table";

export type SortDirection = "asc" | "desc";

export type SortingMode = "frontend" | "backend" | "auto";

export interface DataGridColumn<T> extends Omit<ColumnDef<T>, "cell"> {
    id?: string;
    header?: string;
    accessorKey?: string;
    cell?: (props: { getValue: () => unknown; row: { original: T } }) => React.ReactNode;
    meta?: {
        sorting?: {
            mode?: SortingMode;
            backendSortable?: boolean;
            frontendSortable?: boolean;
        };
        aggregation?: {
            type: "sum" | "avg" | "min" | "max";
            formatter?: (value: number) => string;
        };
    };
}

export interface DataGridAggregation {
    type: "sum" | "avg" | "count" | "min" | "max";
    label: string;
    columnKey?: string;
    value?: number;
    formatter?: (value: number) => string;
}

/**
 * Props common to both the client `DataGrid` and the `ServerDataGrid`. The two
 * components differ only in how pagination/sorting/filtering are sourced
 * (react-table internals vs. controlled props); everything here is shared.
 */
export interface DataGridBaseProps<T> {
    // Data
    data: T[];
    columns: DataGridColumn<T>[];

    // Display
    title?: string;
    emptyMessage?: string;
    className?: string;
    variant?: "default" | "compact" | "comfortable";

    // Features
    enableSorting?: boolean;
    enableSearch?: boolean;
    enableExport?: boolean;
    enablePagination?: boolean;
    onRowClick?: (row: T) => void;
    onExport?: () => void;

    // Search
    searchPlaceholder?: string;
    searchValue?: string;
    onSearchChange?: (value: string) => void;

    // Loading
    isLoading?: boolean;

    // Custom slots
    filterComponent?: React.ReactNode;
    actionComponent?: React.ReactNode;

    // Aggregations / summary footer
    aggregations?: Record<string, DataGridAggregation>;
    showAggregations?: boolean;

    // Page size options offered in the footer selector
    pageSizeOptions?: number[];
}

export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
