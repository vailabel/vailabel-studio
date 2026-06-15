// Public surface for the DataGrid family.
//
//   import { DataGrid, ServerDataGrid } from "@/components/data-grid"
//
// - `DataGrid`        — in-memory sorting/filtering/pagination (client tables).
// - `ServerDataGrid`  — controlled page/sort/filter for backend-paged data.

export { DataGrid, type DataGridProps } from "./data-grid";
export {
    ServerDataGrid,
    type ServerDataGridProps,
    type ServerPagination,
    type ServerSorting,
    type ServerFiltering,
} from "./server-data-grid";
export { DataGridPagination, type DataGridPaginationProps } from "./data-grid-pagination";
export {
    type DataGridColumn,
    type DataGridAggregation,
    type DataGridBaseProps,
    type SortDirection,
    type SortingMode,
} from "./types";
