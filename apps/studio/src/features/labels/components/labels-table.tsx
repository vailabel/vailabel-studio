import React, { useRef, useState } from "react"
import { Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { SketchPicker } from "react-color"
import type { Label as LabelType } from "@/shared/types/core"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui/popover"
import {
  NativeSelect,
  NativeSelectOption,
} from "@/shared/ui/native-select"
import { useConfirmDialog } from "@/shared/hooks/use-confirm-dialog"
import { colorPalette } from "@/shared/lib/label-colors"

type ProjectOption = { id: string; name: string }

interface LabelsTableProps {
  labels: LabelType[]
  projects: ProjectOption[]
  usageByLabelId: Record<string, number>
  onUpdateLabel: (labelId: string, updates: Partial<LabelType>) => Promise<void>
  onDuplicateLabel: (labelId: string) => Promise<void>
  onDeleteLabel: (labelId: string) => Promise<void>
}

/** A cell that flips from a read-only button to a text input on click.
 *  Commits on Enter or blur, cancels on Escape. */
function EditableTextCell({
  value,
  placeholder,
  ariaLabel,
  allowEmpty = false,
  onSave,
}: {
  value: string
  placeholder: string
  ariaLabel: string
  allowEmpty?: boolean
  onSave: (next: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  // While idle the cell renders `value` directly, so the draft only needs to be
  // seeded when editing begins — no effect required to keep it in sync.
  const startEditing = () => {
    setDraft(value)
    setEditing(true)
  }

  const commit = () => {
    setEditing(false)
    const next = draft.trim()
    if (!allowEmpty && !next) return
    if (next === (value ?? "").trim()) return
    onSave(next).catch(() => {})
  }

  if (editing) {
    return (
      <Input
        autoFocus
        aria-label={ariaLabel}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault()
            commit()
          } else if (event.key === "Escape") {
            setEditing(false)
          }
        }}
        className="h-8"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      title="Click to edit"
      className="flex h-8 w-full items-center rounded-md px-2 text-left hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span className={cn("truncate", !value && "text-muted-foreground italic")}>
        {value || placeholder}
      </span>
    </button>
  )
}

/** A swatch that opens a popover with the preset palette + a full picker. */
function ColorCell({
  color,
  onChange,
}: {
  color: string
  onChange: (next: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Change color"
          />
        }
      >
        <span
          className="h-4 w-4 rounded-full border border-border shadow-sm"
          style={{ backgroundColor: color }}
        />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto gap-3 p-3">
        <div className="flex max-w-[176px] flex-wrap gap-1">
          {colorPalette.map((preset) => (
            <button
              key={preset}
              type="button"
              title={preset}
              className={cn(
                "h-7 w-7 rounded-full border-2",
                color === preset ? "border-foreground" : "border-border"
              )}
              style={{ backgroundColor: preset }}
              onClick={() => {
                onChange(preset)
                setOpen(false)
              }}
            />
          ))}
        </div>
        <SketchPicker
          color={color}
          disableAlpha
          onChangeComplete={(picked) => onChange(picked.hex)}
        />
      </PopoverContent>
    </Popover>
  )
}

export const LabelsTable: React.FC<LabelsTableProps> = ({
  labels,
  projects,
  usageByLabelId,
  onUpdateLabel,
  onDuplicateLabel,
  onDeleteLabel,
}) => {
  const confirm = useConfirmDialog()
  // Guards against firing a second confirm while one is already resolving.
  const busy = useRef(false)

  const handleDelete = async (label: LabelType) => {
    if (busy.current) return
    busy.current = true
    try {
      const ok = await confirm({
        title: `Delete "${label.name}"?`,
        description:
          "This removes the label definition. Existing annotations that use it are not deleted.",
        confirmText: "Delete",
        cancelText: "Cancel",
      })
      if (ok) await onDeleteLabel(label.id).catch(() => {})
    } finally {
      busy.current = false
    }
  }

  return (
    <div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Color</TableHead>
              <TableHead className="min-w-[160px]">Name</TableHead>
              <TableHead className="min-w-[200px]">Description</TableHead>
              <TableHead className="w-48">Project</TableHead>
              <TableHead className="w-28 text-right">Usage</TableHead>
              <TableHead className="w-28">Created</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {labels.map((label) => {
              const projectId = label.projectId || label.project_id || ""
              const description = label.description || label.category || ""
              const usage = usageByLabelId[label.id] ?? 0
              return (
                <TableRow key={label.id}>
                  <TableCell>
                    <ColorCell
                      color={label.color}
                      onChange={(next) => {
                        void onUpdateLabel(label.id, { color: next }).catch(
                          () => {}
                        )
                      }}
                    />
                  </TableCell>

                  <TableCell>
                    <EditableTextCell
                      value={label.name}
                      placeholder="Untitled"
                      ariaLabel="Label name"
                      onSave={(next) => onUpdateLabel(label.id, { name: next })}
                    />
                  </TableCell>

                  <TableCell>
                    <EditableTextCell
                      value={description}
                      placeholder="Add a description…"
                      ariaLabel="Label description"
                      allowEmpty
                      onSave={(next) =>
                        onUpdateLabel(label.id, { description: next })
                      }
                    />
                  </TableCell>

                  <TableCell>
                    <NativeSelect
                      size="sm"
                      aria-label="Project"
                      value={projectId}
                      onChange={(event) => {
                        void onUpdateLabel(label.id, {
                          projectId: event.target.value,
                        }).catch(() => {})
                      }}
                      className="w-full"
                    >
                      {projects.length === 0 && (
                        <NativeSelectOption value="">
                          No projects
                        </NativeSelectOption>
                      )}
                      {projects.map((project) => (
                        <NativeSelectOption key={project.id} value={project.id}>
                          {project.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </TableCell>

                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {usage}
                  </TableCell>

                  <TableCell className="text-muted-foreground">
                    {label.createdAt
                      ? new Date(label.createdAt).toLocaleDateString()
                      : "—"}
                  </TableCell>

                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          />
                        }
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            void onDuplicateLabel(label.id).catch(() => {})
                          }}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => void handleDelete(label)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Pencil className="h-3 w-3" />
        Click any name, description, color, or project to edit inline — changes
        save when you press Enter or click away.
      </p>
    </div>
  )
}
