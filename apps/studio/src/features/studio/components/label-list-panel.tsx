import { memo, useCallback, useMemo, useState, type ReactNode } from "react"
import {
  ChevronDown,
  CornerDownLeft,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Tags,
  Trash2,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { cn, getContentBoxColor } from "@/shared/lib/utils"
import { toErrorMessage } from "@/shared/lib/errors"
import { Button } from "@/shared/ui/button"
import { Badge } from "@/shared/ui/badge"
import { Input } from "@/shared/ui/input"
import { Skeleton } from "@/shared/ui/skeleton"
import { ScrollArea } from "@/shared/ui/scroll-area"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog"
import type { Label } from "@/shared/types/core"
import {
  categoryOf,
  orderLabelsForPalette,
} from "@/features/studio/model/lib/label-palette"
import { ClassColorPicker } from "@/features/studio/components/classes/class-color-picker"
import { NewClassForm } from "@/features/studio/components/classes/new-class-form"

type LabelUpdates = Pick<Partial<Label>, "name" | "color" | "category">

interface LabelListPanelProps {
  /** Single click: arm this class as the active class (new shapes inherit it). */
  onLabelSelect: (label: Label) => void
  /** Relabel the currently selected shape to this class. */
  onLabelAssign: (label: Label) => void
  /** Clear the active class (back to "ask me after each shape"). */
  onClearActive?: () => void
  /** Class management — when omitted the panel is read-only. */
  onCreateLabel?: (input: { name: string; color: string }) => Promise<unknown>
  onUpdateLabel?: (labelId: string, updates: LabelUpdates) => Promise<unknown>
  onDeleteLabel?: (labelId: string) => Promise<unknown>
  labels: Label[]
  /** Shapes per class on the current item, keyed by label id. */
  shapeCounts?: Map<string, number>
  /** Currently armed class (new shapes inherit it). */
  activeLabelId?: string | null
  /** Class of the currently selected shape — marked as "current" in the list. */
  selectedLabelId?: string | null
  /** Whether a shape is selected (drives the relabel affordance). */
  hasSelectedShape?: boolean
  isLoading?: boolean
}

/** Show the search box once the list is long enough to need it. */
const SEARCH_THRESHOLD = 8

export const LabelListPanel = memo(
  ({
    onLabelSelect,
    onLabelAssign,
    onClearActive,
    onCreateLabel,
    onUpdateLabel,
    onDeleteLabel,
    labels,
    shapeCounts,
    activeLabelId = null,
    selectedLabelId = null,
    hasSelectedShape = false,
    isLoading = false,
  }: LabelListPanelProps) => {
    const [query, setQuery] = useState("")
    const [showCreate, setShowCreate] = useState(false)
    const [pendingDelete, setPendingDelete] = useState<Label | null>(null)

    // Palette order drives both the list and the 1–9 hotkeys, so the number
    // shown next to a class is the key that arms it.
    const ordered = useMemo(() => orderLabelsForPalette(labels), [labels])
    const hotkeyById = useMemo(() => {
      const map = new Map<string, number>()
      ordered.slice(0, 9).forEach((label, index) => map.set(label.id, index + 1))
      return map
    }, [ordered])

    const groups = useMemo(() => {
      const needle = query.trim().toLowerCase()
      const visible = needle
        ? ordered.filter(
            (label) =>
              label.name.toLowerCase().includes(needle) ||
              categoryOf(label).toLowerCase().includes(needle)
          )
        : ordered
      const map = new Map<string, Label[]>()
      for (const label of visible) {
        const category = categoryOf(label)
        map.set(category, [...(map.get(category) ?? []), label])
      }
      return [...map.entries()]
    }, [ordered, query])

    const activeLabel = labels.find((label) => label.id === activeLabelId) ?? null
    const canManage = !!onCreateLabel
    const createOpen = canManage && (showCreate || labels.length === 0)

    const handleCreate = useCallback(
      async (input: { name: string; color: string }) => {
        // Keep the form open after the first class (it was only auto-shown while
        // the list was empty) so several classes can be added in a row.
        setShowCreate(true)
        await onCreateLabel?.(input)
        toast.success(`Class “${input.name}” added`, {
          description: "Click it (or press its number) to start drawing with it.",
        })
      },
      [onCreateLabel]
    )

    const confirmDelete = useCallback(async () => {
      const label = pendingDelete
      setPendingDelete(null)
      if (!label || !onDeleteLabel) return
      try {
        await onDeleteLabel(label.id)
        toast.success(`Class “${label.name}” deleted`)
      } catch (error) {
        toast.error(toErrorMessage(error, "Couldn't delete the class."))
      }
    }, [onDeleteLabel, pendingDelete])

    return (
      <div className="flex h-full flex-col border-l border-border bg-card text-card-foreground">
        <div className="space-y-2 border-b border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">
              Classes{" "}
              <span className="font-normal text-muted-foreground">
                {isLoading ? "" : `(${labels.length})`}
              </span>
            </h2>
            {canManage && labels.length > 0 ? (
              <Button
                variant={showCreate ? "secondary" : "outline"}
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => setShowCreate((open) => !open)}
                aria-expanded={showCreate}
              >
                {showCreate ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
                {showCreate ? "Close" : "New class"}
              </Button>
            ) : null}
          </div>

          {createOpen ? (
            <NewClassForm labels={labels} onCreate={handleCreate} autoFocus={showCreate} />
          ) : null}

          <StatusBanner
            activeLabel={activeLabel}
            hasSelectedShape={hasSelectedShape}
            hasLabels={labels.length > 0}
            onClearActive={onClearActive}
          />

          {labels.length > SEARCH_THRESHOLD ? (
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search classes"
                aria-label="Search classes"
                className="h-8 pl-7"
              />
            </div>
          ) : null}
        </div>

        <ScrollArea className="min-h-0 flex-1">
          {isLoading ? (
            <LoadingSkeleton />
          ) : labels.length === 0 ? (
            <GettingStarted canManage={canManage} />
          ) : groups.length === 0 ? (
            <p className="p-6 text-center text-xs text-muted-foreground">
              No class matches “{query}”.
            </p>
          ) : (
            <div className="space-y-3 p-3">
              {groups.map(([category, groupLabels]) => (
                <CategorySection
                  key={category}
                  category={category}
                  showHeader={groups.length > 1 || category !== "Uncategorized"}
                  count={groupLabels.length}
                >
                  {groupLabels.map((label) => (
                    <LabelItem
                      key={label.id}
                      label={label}
                      hotkey={hotkeyById.get(label.id)}
                      shapeCount={shapeCounts?.get(label.id) ?? 0}
                      isActive={label.id === activeLabelId}
                      isCurrent={label.id === selectedLabelId}
                      hasSelectedShape={hasSelectedShape}
                      onSelect={onLabelSelect}
                      onAssign={onLabelAssign}
                      onUpdate={onUpdateLabel}
                      onRequestDelete={onDeleteLabel ? setPendingDelete : undefined}
                    />
                  ))}
                </CategorySection>
              ))}
            </div>
          )}
        </ScrollArea>

        <AlertDialog
          open={!!pendingDelete}
          onOpenChange={(open) => {
            if (!open) setPendingDelete(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete class “{pendingDelete?.name}”?</AlertDialogTitle>
              <AlertDialogDescription>
                The class is removed from this project. Shapes already labeled with it keep
                their name and color, so no existing work is lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={() => void confirmDelete()}>
                Delete class
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }
)

LabelListPanel.displayName = "LabelListPanel"

/** One-line explanation of what clicking / drawing will do right now. */
function StatusBanner({
  activeLabel,
  hasSelectedShape,
  hasLabels,
  onClearActive,
}: {
  activeLabel: Label | null
  hasSelectedShape: boolean
  hasLabels: boolean
  onClearActive?: () => void
}) {
  if (!hasLabels) return null

  if (hasSelectedShape) {
    return (
      <p className="rounded-md bg-primary/5 px-2 py-1.5 text-xs text-muted-foreground">
        Shape selected — press <strong className="text-foreground">Apply</strong> on a class
        (or <Key>Shift</Key>+<Key>1–9</Key>) to change its class.
      </p>
    )
  }

  if (activeLabel) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-2 py-1.5 text-xs">
        <span
          className="size-3 flex-shrink-0 rounded-full"
          style={{ backgroundColor: activeLabel.color }}
        />
        <span className="min-w-0 flex-1 truncate">
          New shapes → <strong>{activeLabel.name}</strong>
        </span>
        {onClearActive ? (
          <button
            type="button"
            onClick={onClearActive}
            className="flex-shrink-0 rounded px-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Stop using this class (Esc)"
          >
            Clear <Key>Esc</Key>
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <p className="rounded-md bg-muted/60 px-2 py-1.5 text-xs text-muted-foreground">
      Click a class (or press <Key>1–9</Key>) to draw with it — otherwise you'll be asked
      after each shape.
    </p>
  )
}

function Key({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-background px-1 text-[10px] font-semibold text-muted-foreground">
      {children}
    </kbd>
  )
}

const LoadingSkeleton = memo(() => (
  <div className="space-y-2 p-3">
    {Array.from({ length: 4 }).map((_, i) => (
      <Skeleton key={i} className="h-10 rounded-lg" />
    ))}
  </div>
))

LoadingSkeleton.displayName = "LoadingSkeleton"

/** Empty state that teaches the whole loop in three steps. */
const GettingStarted = memo(({ canManage }: { canManage: boolean }) => (
  <div className="m-3 rounded-lg border border-dashed border-border bg-muted/40 p-4">
    <div className="mb-3 flex items-center gap-2">
      <div className="flex size-8 items-center justify-center rounded-full bg-muted">
        <Tags className="size-4 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-medium">Start labeling in 3 steps</h3>
    </div>
    <ol className="space-y-2 text-xs text-muted-foreground">
      <Step n={1}>
        {canManage
          ? "Add the classes you want to label above (e.g. car, person)."
          : "Draw a shape and type a class name to create your first class."}
      </Step>
      <Step n={2}>
        Pick a drawing tool on the left — <Key>B</Key> box, <Key>P</Key> polygon.
      </Step>
      <Step n={3}>
        Draw on the image. Or let AI do a first pass with{" "}
        <span className="inline-flex items-center gap-0.5 font-medium text-foreground">
          <Sparkles className="size-3" /> Auto-label
        </span>{" "}
        in the toolbar.
      </Step>
    </ol>
  </div>
))

GettingStarted.displayName = "GettingStarted"

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="flex size-4 flex-shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
        {n}
      </span>
      <span>{children}</span>
    </li>
  )
}

const CategorySection = memo(
  ({
    category,
    count,
    showHeader,
    children,
  }: {
    category: string
    count: number
    showHeader: boolean
    children: ReactNode
  }) => {
    const [isOpen, setIsOpen] = useState(true)
    if (!showHeader) return <div className="space-y-1.5">{children}</div>

    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger
          render={
            <Button
              variant="ghost"
              className="mb-1 h-auto w-full justify-between gap-2 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <ChevronDown
                  className={cn("size-3.5 flex-shrink-0", !isOpen && "-rotate-90")}
                />
                <span className="truncate">{category}</span>
              </span>
              <Badge variant="secondary" className="font-normal">
                {count}
              </Badge>
            </Button>
          }
        />
        <CollapsibleContent>
          <div className="space-y-1.5">{children}</div>
        </CollapsibleContent>
      </Collapsible>
    )
  }
)

CategorySection.displayName = "CategorySection"

interface LabelItemProps {
  label: Label
  hotkey?: number
  shapeCount: number
  isActive: boolean
  isCurrent: boolean
  hasSelectedShape: boolean
  onSelect: (label: Label) => void
  onAssign: (label: Label) => void
  onUpdate?: (labelId: string, updates: LabelUpdates) => Promise<unknown>
  onRequestDelete?: (label: Label) => void
}

const LabelItem = memo(
  ({
    label,
    hotkey,
    shapeCount,
    isActive,
    isCurrent,
    hasSelectedShape,
    onSelect,
    onAssign,
    onUpdate,
    onRequestDelete,
  }: LabelItemProps) => {
    const [isRenaming, setIsRenaming] = useState(false)

    const save = useCallback(
      async (updates: LabelUpdates) => {
        if (!onUpdate) return
        try {
          await onUpdate(label.id, updates)
        } catch (error) {
          toast.error(toErrorMessage(error, "Couldn't update the class."))
          throw error
        }
      },
      [label.id, onUpdate]
    )

    if (isRenaming) {
      return (
        <RenameRow
          label={label}
          onCancel={() => setIsRenaming(false)}
          onSave={async (name) => {
            await save({ name })
            setIsRenaming(false)
          }}
        />
      )
    }

    const canApply = hasSelectedShape && !isCurrent

    return (
      <div
        role="button"
        tabIndex={0}
        style={{
          backgroundColor: getContentBoxColor(label.color, isActive ? 0.18 : 0.08),
          borderColor: getContentBoxColor(label.color, isActive ? 0.9 : 0.45),
        }}
        className={cn(
          "group flex cursor-pointer select-none items-center gap-2 rounded-lg border px-2.5 py-2 hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:brightness-125",
          isActive && "ring-2 ring-primary",
          isCurrent && !isActive && "ring-2 ring-primary/40"
        )}
        onClick={() => onSelect(label)}
        onDoubleClick={() => onAssign(label)}
        onKeyDown={(event) => {
          // Ignore keys bubbling from the row's menu / color popover (portals).
          if (event.target !== event.currentTarget) return
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            onSelect(label)
          }
        }}
        title={
          hasSelectedShape
            ? "Click to draw with this class · Apply to relabel the selected shape"
            : "Click to draw new shapes with this class"
        }
        aria-pressed={isActive}
      >
        {onUpdate ? (
          <ClassColorPicker
            size="sm"
            color={label.color}
            onChange={(color) => void save({ color }).catch(() => undefined)}
            label={`Change color of ${label.name}`}
          />
        ) : (
          <span
            className="size-4 flex-shrink-0 rounded-full border-2 border-background shadow-sm"
            style={{ backgroundColor: label.color }}
          />
        )}

        <span className="min-w-0 flex-1 truncate text-sm font-medium">{label.name}</span>

        {label.isAIGenerated ? (
          <span title="Class proposed by AI" className="flex-shrink-0 text-success">
            <Sparkles className="size-3.5" />
          </span>
        ) : null}

        {shapeCount > 0 ? (
          <span
            className="flex-shrink-0 text-xs tabular-nums text-muted-foreground"
            title={`${shapeCount} shape${shapeCount === 1 ? "" : "s"} on this item`}
          >
            ×{shapeCount}
          </span>
        ) : null}

        {isCurrent ? (
          <Badge
            variant="outline"
            className="flex-shrink-0 border-primary/40 text-[10px] font-medium uppercase tracking-wide text-primary"
          >
            selected
          </Badge>
        ) : null}

        {canApply ? (
          <Button
            size="sm"
            variant="secondary"
            className="h-6 flex-shrink-0 gap-1 px-1.5 text-xs"
            onClick={(event) => {
              event.stopPropagation()
              onAssign(label)
            }}
            title={`Change the selected shape to “${label.name}”${hotkey ? ` (Shift+${hotkey})` : ""}`}
          >
            <CornerDownLeft className="size-3" />
            Apply
          </Button>
        ) : null}

        {hotkey ? (
          <kbd
            className={cn(
              "flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded border px-1 text-xs font-semibold",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-muted text-muted-foreground"
            )}
            title={`Press ${hotkey} to draw with this class`}
          >
            {hotkey}
          </kbd>
        ) : null}

        {onUpdate || onRequestDelete ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 flex-shrink-0 p-0 text-muted-foreground"
                  aria-label={`More actions for ${label.name}`}
                  onClick={(event) => event.stopPropagation()}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
              {onUpdate ? (
                <DropdownMenuItem onClick={() => setIsRenaming(true)}>
                  <Pencil className="size-4" />
                  Rename
                </DropdownMenuItem>
              ) : null}
              {onUpdate ? (
                <DropdownMenuItem onClick={() => onSelect(label)}>
                  <Tags className="size-4" />
                  Draw with this class
                </DropdownMenuItem>
              ) : null}
              {onRequestDelete ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onRequestDelete(label)}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    )
  }
)

LabelItem.displayName = "LabelItem"

function RenameRow({
  label,
  onSave,
  onCancel,
}: {
  label: Label
  onSave: (name: string) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(label.name)
  const [busy, setBusy] = useState(false)

  const commit = async () => {
    const trimmed = name.trim()
    if (!trimmed || trimmed === label.name) {
      onCancel()
      return
    }
    setBusy(true)
    try {
      await onSave(trimmed)
    } catch {
      setBusy(false)
    }
  }

  return (
    <form
      className="flex items-center gap-2 rounded-lg border border-primary/50 px-2.5 py-1.5"
      onSubmit={(event) => {
        event.preventDefault()
        void commit()
      }}
    >
      <span
        className="size-4 flex-shrink-0 rounded-full"
        style={{ backgroundColor: label.color }}
      />
      <Input
        autoFocus
        value={name}
        disabled={busy}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") onCancel()
        }}
        onBlur={() => void commit()}
        aria-label={`Rename ${label.name}`}
        className="h-7 flex-1"
      />
    </form>
  )
}
