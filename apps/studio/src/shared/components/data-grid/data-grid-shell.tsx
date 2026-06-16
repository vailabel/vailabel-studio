// Internal presentational shell shared by `DataGrid` and `ServerDataGrid`.
// It owns all the layout/chrome (header, search bar, table, aggregation +
// pagination footer) and knows nothing about *where* sorting/pagination come
// from — the wrappers feed it a configured react-table instance plus a small
// set of sort callbacks and a ready-made pagination node.

import React from "react";
import {
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Database,
    Calculator,
    Search,
    Download,
} from "lucide-react";
import { flexRender, type Table as ReactTable } from "@tanstack/react-table";
import { Button } from "@/shared/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@/shared/ui/table";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import type { DataGridAggregation, DataGridColumn, SortDirection } from "./types";

export interface DataGridShellProps<T> {
    table: ReactTable<T>;
    columns: DataGridColumn<T>[];

    // Display
    title?: string;
    emptyMessage: string;
    className: string;
    variant: "default" | "compact" | "comfortable";

    // Features
    enableSorting: boolean;
    enableSearch: boolean;
    enableExport: boolean;
    onRowClick?: (row: T) => void;
    onExport?: () => void;

    // Search
    searchPlaceholder: string;
    searchValue: string;
    onSearchChange?: (value: string) => void;

    // Slots
    filterComponent?: React.ReactNode;
    actionComponent?: React.ReactNode;

    // Aggregations
    aggregations?: Record<string, DataGridAggregation>;
    showAggregations: boolean;

    // Sorting wiring (mode-specific, supplied by the wrapper)
    sortMode: "frontend" | "backend";
    canSort: (columnId: string) => boolean;
    getSortState: (columnId: string) => SortDirection | false;
    onSort: (columnId: string) => void;

    // Pagination node (already wired by the wrapper), rendered in the footer
    pagination?: React.ReactNode;
}

function getVariantClasses(variant: "default" | "compact" | "comfortable") {
    switch (variant) {
        case "compact":
            return "text-sm";
        case "comfortable":
            return "text-base py-4";
        default:
            return "";
    }
}

export function DataGridShell<T>({
    table,
    columns,
    title,
    emptyMessage,
    className,
    variant,
    enableSorting,
    enableSearch,
    enableExport,
    onRowClick,
    onExport,
    searchPlaceholder,
    searchValue,
    onSearchChange,
    filterComponent,
    actionComponent,
    aggregations,
    showAggregations,
    sortMode,
    canSort,
    getSortState,
    onSort,
    pagination,
}: DataGridShellProps<T>) {
    const getSortIcon = (columnId: string) => {
        const column = columns.find((col) => col.id === columnId);
        const columnSortingMode = column?.meta?.sorting?.mode ?? sortMode;

        const modeIndicator =
            columnSortingMode === "backend" ? (
                <Database className="h-2 w-2 text-chart-1" />
            ) : (
                <Calculator className="h-2 w-2 text-chart-2" />
            );

        const sorted = getSortState(columnId);

        if (sorted === "asc") {
            return (
                <div className="flex items-center space-x-1">
                    <ArrowUp className="h-3 w-3" />
                    {modeIndicator}
                </div>
            );
        }

        if (sorted === "desc") {
            return (
                <div className="flex items-center space-x-1">
                    <ArrowDown className="h-3 w-3" />
                    {modeIndicator}
                </div>
            );
        }

        return (
            <div className="flex items-center space-x-1">
                <ArrowUpDown className="h-3 w-3 opacity-50" />
                {modeIndicator}
            </div>
        );
    };

    const hasAggregations = showAggregations && aggregations && Object.keys(aggregations).length > 0;

    return (
        <div className={`space-y-3 ${className}`}>
            {/* Header Section */}
            {(title || actionComponent) && (
                <div className="flex items-center justify-between">
                    {title && <h3 className="text-lg font-semibold">{title}</h3>}
                    <div className="flex items-center gap-2">{actionComponent}</div>
                </div>
            )}

            {/* Search and Filter Section */}
            {(enableSearch || filterComponent || enableExport) && (
                <div className="space-y-4">
                    {enableSearch && (
                        <div className="flex items-center gap-3">
                            <div className="flex-1 max-w-md">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder={searchPlaceholder}
                                        value={searchValue}
                                        onChange={(e) => onSearchChange?.(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            {enableExport && (
                                <Button variant="outline" size="sm" onClick={onExport}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Export
                                </Button>
                            )}
                        </div>
                    )}
                    {filterComponent && <div className="w-full">{filterComponent}</div>}
                </div>
            )}

            {/* Data Table */}
            <div className="rounded-md border overflow-x-auto w-full">
                <div className="min-w-max">
                    <Table className={getVariantClasses(variant)}>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="border-border/50 hover:bg-muted/30">
                                    {headerGroup.headers.map((header) => {
                                        const sortable = enableSorting && canSort(header.column.id);
                                        return (
                                            <TableHead
                                                key={header.id}
                                                className={`font-medium text-foreground transition-colors ${
                                                    sortable ? "cursor-pointer select-none hover:bg-muted/50" : ""
                                                }`}
                                                onClick={() => {
                                                    if (sortable) onSort(header.column.id);
                                                }}
                                            >
                                                {header.isPlaceholder ? null : (
                                                    <div className="flex items-center space-x-2">
                                                        <span>
                                                            {flexRender(
                                                                header.column.columnDef.header,
                                                                header.getContext()
                                                            )}
                                                        </span>
                                                        {sortable && (
                                                            <span className="text-muted-foreground">
                                                                {getSortIcon(header.column.id)}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </TableHead>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        className={`transition-colors hover:bg-muted/50 ${
                                            onRowClick ? "cursor-pointer" : ""
                                        }`}
                                        onClick={(e) => {
                                            // Don't trigger row click if clicking interactive elements
                                            const target = e.target as HTMLElement;
                                            if (
                                                target.tagName === "BUTTON" ||
                                                target.tagName === "A" ||
                                                target.closest("button") ||
                                                target.closest("a") ||
                                                target.closest("[role='button']")
                                            ) {
                                                return;
                                            }
                                            onRowClick?.(row.original);
                                        }}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id} className="py-3">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="h-32 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground py-8">
                                            <p className="text-sm">{emptyMessage}</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>

                        {/* Footer with Aggregations and Pagination */}
                        {hasAggregations || pagination ? (
                            <TableFooter>
                                {hasAggregations && (
                                    <TableRow className="bg-muted/30">
                                        <TableCell colSpan={columns.length} className="py-3">
                                            <div className="flex items-center gap-4">
                                                <span className="text-sm font-medium text-muted-foreground">
                                                    Summary:
                                                </span>
                                                <div className="flex flex-wrap gap-3">
                                                    {Object.entries(aggregations!).map(([key, config]) => (
                                                        <div key={key} className="flex items-center space-x-2">
                                                            <span className="text-sm text-muted-foreground">
                                                                {config.label}:
                                                            </span>
                                                            <Badge variant="secondary" className="font-mono text-xs">
                                                                {config.formatter
                                                                    ? config.formatter(config.value || 0)
                                                                    : config.value?.toFixed(2) || "0.00"}
                                                            </Badge>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}

                                {pagination && (
                                    <TableRow className="border-t">
                                        <TableCell colSpan={columns.length} className="py-3">
                                            {pagination}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableFooter>
                        ) : null}
                    </Table>
                </div>
            </div>
        </div>
    );
}

export default DataGridShell;
