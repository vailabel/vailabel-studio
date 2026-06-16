import { cn, getContentBoxColor } from "@/lib/utils"
import { ChevronDown, Sparkles, Tags } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Label } from "@/types/core"
import { memo, useMemo, useCallback, useState } from "react"

interface LabelListPanelProps {
  /** Single click: arm this class as the active class (new shapes inherit it). */
  onLabelSelect: (label: Label) => void
  /** Double click: relabel the currently selected shape to this class. */
  onLabelAssign: (label: Label) => void
  labels: Label[]
  /** Currently armed class (new shapes inherit it). */
  activeLabelId?: string | null
  /** Class of the currently selected shape — marked as "current" in the list. */
  selectedLabelId?: string | null
  /** Whether a shape is selected (drives the relabel hint). */
  hasSelectedShape?: boolean
  isLoading?: boolean
}

/** Map the first nine classes (in list order) to their 1–9 hotkey number. */
function useHotkeyMap(labels: Label[]): Map<string, number> {
  return useMemo(() => {
    const map = new Map<string, number>()
    labels.slice(0, 9).forEach((label, index) => {
      map.set(label.id, index + 1)
    })
    return map
  }, [labels])
}

export const LabelListPanel = memo(
  ({
    onLabelSelect,
    onLabelAssign,
    labels,
    activeLabelId,
    selectedLabelId,
    hasSelectedShape = false,
    isLoading = false,
  }: LabelListPanelProps) => {
    // Memoize grouped labels to prevent unnecessary recalculations
    const groupedLabels = useMemo(() => {
      return labels.reduce(
        (acc, label) => {
          const category = label.category || "Uncategorized"
          if (!acc[category]) acc[category] = []
          acc[category].push(label)
          return acc
        },
        {} as Record<string, Label[]>
      )
    }, [labels])

    const hotkeyByLabelId = useHotkeyMap(labels)

    // Layout mirrors FileListPanel: fixed header + a min-h-0 flex-1 ScrollArea so
    // the list scrolls within the panel instead of growing and being clipped.
    return (
      <div className="flex h-full flex-col border-l border-border bg-card text-card-foreground">
        <div className="space-y-1 border-b border-border p-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Classes</h2>
            <span className="text-xs text-muted-foreground">
              {isLoading ? "Loading..." : `${labels.length} total`}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {labels.length === 0
              ? "Draw on the canvas to create your first class"
              : hasSelectedShape
                ? "Double-click a class to relabel the selected shape"
                : "Click or press 1–9 to set the active class"}
          </p>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          {isLoading ? (
            <LoadingSkeleton />
          ) : (
            <LabelList
              labelGroup={groupedLabels}
              onLabelSelect={onLabelSelect}
              onLabelAssign={onLabelAssign}
              activeLabelId={activeLabelId ?? null}
              selectedLabelId={selectedLabelId ?? null}
              hotkeyByLabelId={hotkeyByLabelId}
            />
          )}
        </ScrollArea>
      </div>
    )
  },
  // Custom comparison function to ensure re-render when props change
  (prevProps, nextProps) => {
    return (
      prevProps.labels === nextProps.labels &&
      prevProps.isLoading === nextProps.isLoading &&
      prevProps.activeLabelId === nextProps.activeLabelId &&
      prevProps.selectedLabelId === nextProps.selectedLabelId &&
      prevProps.hasSelectedShape === nextProps.hasSelectedShape &&
      prevProps.onLabelSelect === nextProps.onLabelSelect &&
      prevProps.onLabelAssign === nextProps.onLabelAssign
    )
  }
)

LabelListPanel.displayName = "LabelListPanel"

interface LabelListProps {
  labelGroup: Record<string, Label[]>
  onLabelSelect: (label: Label) => void
  onLabelAssign: (label: Label) => void
  activeLabelId: string | null
  selectedLabelId: string | null
  hotkeyByLabelId: Map<string, number>
}

// Loading skeleton component
const LoadingSkeleton = memo(() => (
  <div className="space-y-4 p-3">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <div className="space-y-2 pl-4">
          {Array.from({ length: 2 }).map((_, j) => (
            <Skeleton key={j} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
    ))}
  </div>
))

LoadingSkeleton.displayName = "LoadingSkeleton"

// Memoized label item component for better performance
const LabelItem = memo(
  ({
    label,
    onLabelSelect,
    onLabelAssign,
    isActive,
    isCurrent,
    hotkey,
  }: {
    label: Label
    onLabelSelect: (label: Label) => void
    onLabelAssign: (label: Label) => void
    isActive: boolean
    isCurrent: boolean
    hotkey?: number
  }) => {
    // Single click arms this class; double click relabels the selected shape.
    const handleClick = useCallback(() => {
      onLabelSelect(label)
    }, [label, onLabelSelect])

    const handleDoubleClick = useCallback(() => {
      onLabelAssign(label)
    }, [label, onLabelAssign])

    return (
      <div
        // Tint each item with its own label color (handles hex + rgb) so classes
        // are visually distinct at a glance; the armed item keeps the primary ring.
        style={{
          backgroundColor: getContentBoxColor(label.color, 0.1),
          borderColor: getContentBoxColor(label.color, 0.55),
        }}
        className={cn(
          "flex cursor-pointer select-none items-center gap-2 rounded-lg border p-3 transition-colors hover:brightness-95 dark:hover:brightness-125",
          isActive && "ring-2 ring-primary",
          // The selected shape's class gets a softer ring (plus the "current"
          // badge) so it's clear which class a double-click would change away from.
          isCurrent && !isActive && "ring-2 ring-primary/40"
        )}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        title="Click to set the active class · Double-click to relabel the selected shape"
        aria-pressed={isActive}
      >
        <span
          style={{ backgroundColor: label.color }}
          className={cn(
            "h-4 w-4 flex-shrink-0 rounded-full border-2 border-white shadow-sm",
            label.isAIGenerated && "ring-2 ring-emerald-400 dark:ring-emerald-600"
          )}
        />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {label.name}
        </span>
        {isCurrent && (
          <Badge
            variant="outline"
            className="flex-shrink-0 border-primary/40 text-[10px] font-medium uppercase tracking-wide text-primary"
          >
            current
          </Badge>
        )}
        {label.isAIGenerated && (
          <Badge
            variant="outline"
            className="flex-shrink-0 gap-1 border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            <Sparkles className="size-3" />
            AI
          </Badge>
        )}
        {hotkey ? (
          <kbd
            className={cn(
              "flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded border px-1 text-xs font-semibold",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-muted text-muted-foreground"
            )}
          >
            {hotkey}
          </kbd>
        ) : null}
      </div>
    )
  },
  (prevProps, nextProps) => {
    // Only re-render if the label, active/current state, handlers, or hotkey changed
    return (
      prevProps.label.id === nextProps.label.id &&
      prevProps.label.name === nextProps.label.name &&
      prevProps.label.color === nextProps.label.color &&
      prevProps.label.isAIGenerated === nextProps.label.isAIGenerated &&
      prevProps.isActive === nextProps.isActive &&
      prevProps.isCurrent === nextProps.isCurrent &&
      prevProps.hotkey === nextProps.hotkey &&
      prevProps.onLabelSelect === nextProps.onLabelSelect &&
      prevProps.onLabelAssign === nextProps.onLabelAssign
    )
  }
)

LabelItem.displayName = "LabelItem"

// Memoized category section component
const CategorySection = memo(
  ({
    category,
    labels,
    onLabelSelect,
    onLabelAssign,
    activeLabelId,
    selectedLabelId,
    hotkeyByLabelId,
  }: {
    category: string
    labels: Label[]
    onLabelSelect: (label: Label) => void
    onLabelAssign: (label: Label) => void
    activeLabelId: string | null
    selectedLabelId: string | null
    hotkeyByLabelId: Map<string, number>
  }) => {
    const [isOpen, setIsOpen] = useState(true)

    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-4">
        <CollapsibleTrigger
          render={
            <Button
              variant="ghost"
              className="mb-1 h-auto w-full justify-between gap-2 px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <ChevronDown
                  className={cn(
                    "size-3.5 flex-shrink-0",
                    !isOpen && "-rotate-90"
                  )}
                />
                <span className="truncate">{category}</span>
              </span>
              <Badge variant="secondary" className="font-normal">
                {labels.length}
              </Badge>
            </Button>
          }
        />
        <CollapsibleContent>
          <div className="space-y-2">
            {labels.map((label) => (
              <LabelItem
                key={label.id}
                label={label}
                onLabelSelect={onLabelSelect}
                onLabelAssign={onLabelAssign}
                isActive={label.id === activeLabelId}
                isCurrent={label.id === selectedLabelId}
                hotkey={hotkeyByLabelId.get(label.id)}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    )
  }
)

CategorySection.displayName = "CategorySection"

const LabelList = memo(
  ({
    labelGroup,
    onLabelSelect,
    onLabelAssign,
    activeLabelId,
    selectedLabelId,
    hotkeyByLabelId,
  }: LabelListProps) => {
    const hasLabels = Object.keys(labelGroup).length > 0

    return (
      <div className="p-3">
        {hasLabels ? (
          <div className="space-y-4">
            {Object.entries(labelGroup)
              .sort(([a], [b]) => {
                // Sort categories alphabetically, but put "Uncategorized" last
                if (a === "Uncategorized") return 1
                if (b === "Uncategorized") return -1
                return a.localeCompare(b)
              })
              .map(([category, labels]) => (
                <CategorySection
                  key={category}
                  category={category}
                  labels={labels}
                  onLabelSelect={onLabelSelect}
                  onLabelAssign={onLabelAssign}
                  activeLabelId={activeLabelId}
                  selectedLabelId={selectedLabelId}
                  hotkeyByLabelId={hotkeyByLabelId}
                />
              ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    )
  }
)

LabelList.displayName = "LabelList"

// Improved empty state component
const EmptyState = memo(() => (
  <div className="mt-8 rounded-lg border border-dashed border-border bg-muted/50 p-8 text-center">
    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
      <Tags className="h-6 w-6 text-muted-foreground" />
    </div>
    <h3 className="mb-2 text-sm font-medium text-foreground">
      No classes created yet
    </h3>
    <p className="text-xs text-muted-foreground">
      Use the drawing tools to create your first class
    </p>
  </div>
))

EmptyState.displayName = "EmptyState"
