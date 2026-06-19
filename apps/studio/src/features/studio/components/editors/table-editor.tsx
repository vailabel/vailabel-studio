import { memo, useMemo } from "react"
import { Table2 } from "lucide-react"
import { useClassification } from "@/features/studio/components/common/use-classification"
import { ClassChoices } from "./text/class-choices"
import type { EditorProps } from "./types"

// Tabular modality editor. Label Studio's structured-data model: each imported
// row is one task, so the editor renders the current row (its column values,
// carried inline on `image.data`) as a key/value table and labels the whole row
// with single-choice classification. Region/cell labeling is a later phase.
export const TableEditor = memo(({ viewModel }: EditorProps) => {
  const item = viewModel.data.item
  const { labels } = viewModel.data
  const classification = useClassification(viewModel)

  // `data` is a JSON object keyed by column header; render it in a stable order.
  const cells = useMemo(() => {
    const data = item?.data
    if (!data || typeof data !== "object") return []
    return Object.entries(data as Record<string, unknown>).map(
      ([column, value]) => ({
        column,
        value:
          value == null
            ? ""
            : typeof value === "string"
              ? value
              : String(value),
      })
    )
  }, [item?.data])

  if (!item) {
    return (
      <div className="flex flex-1 items-center justify-center bg-muted">
        <p className="text-muted-foreground">No rows in this project</p>
      </div>
    )
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-background">
      {/* Row header */}
      <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-2 text-sm">
        <Table2 className="size-4 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate font-medium" title={item.name}>
          {item.name}
        </span>
      </div>

      {/* Row contents as a key/value table */}
      <div className="min-h-0 flex-1 overflow-auto p-6 pb-28">
        {cells.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This row has no data.
          </p>
        ) : (
          <div className="mx-auto max-w-3xl overflow-hidden rounded-lg border border-border">
            <table className="w-full border-collapse text-sm">
              <tbody>
                {cells.map((cell, index) => (
                  <tr
                    key={cell.column}
                    className={index % 2 === 0 ? "bg-card" : "bg-muted/40"}
                  >
                    <th
                      scope="row"
                      className="w-1/3 border-b border-border px-4 py-2 text-left align-top font-medium text-muted-foreground"
                    >
                      {cell.column}
                    </th>
                    <td className="border-b border-border px-4 py-2 align-top whitespace-pre-wrap break-words">
                      {cell.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Whole-row classification (single choice) */}
      <ClassChoices
        labels={labels}
        selected={classification.selectedNames}
        multiple={false}
        title="Row label"
        onToggle={(label) =>
          classification.selectedNames.has(label.name)
            ? void classification.clear()
            : void classification.assign(label)
        }
        onClear={() => void classification.clear()}
      />
    </div>
  )
})

TableEditor.displayName = "TableEditor"
