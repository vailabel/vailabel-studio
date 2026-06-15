import { cn } from "@/lib/utils"
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
  onLabelSelect: (label: Label) => void
  labels: Label[]
  /** Currently armed class (new shapes inherit it). */
  activeLabelId?: string | null
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
  ({ onLabelSelect, labels, activeLabelId, isLoading = false }: LabelListPanelProps) => {
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
            {labels.length > 0
              ? "Click or press 1–9 to set the active class"
              : "Draw on the canvas to create your first class"}
          </p>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          {isLoading ? (
            <LoadingSkeleton />
          ) : (
            <LabelList
              labelGroup={groupedLabels}
              onLabelSelect={onLabelSelect}
              activeLabelId={activeLabelId ?? null}
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
      prevProps.onLabelSelect === nextProps.onLabelSelect
    )
  }
)

LabelListPanel.displayName = "LabelListPanel"

interface LabelListProps {
  labelGroup: Record<string, Label[]>
  onLabelSelect: (label: Label) => void
  activeLabelId: string | null
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
    isActive,
    hotkey,
  }: {
    label: Label
    onLabelSelect: (label: Label) => void
    isActive: boolean
    hotkey?: number
  }) => {
    const handleClick = useCallback(() => {
      onLabelSelect(label)
    }, [label, onLabelSelect])

    return (
      <div
        className={cn(
          "flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 transition-colors hover:bg-muted",
          isActive
            ? "border-primary bg-primary/5 ring-2 ring-primary"
            : label.isAIGenerated
              ? "border-emerald-300/70 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20"
              : ""
        )}
        onClick={handleClick}
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
    // Only re-render if the label, active state, or hotkey changed
    return (
      prevProps.label.id === nextProps.label.id &&
      prevProps.label.name === nextProps.label.name &&
      prevProps.label.color === nextProps.label.color &&
      prevProps.label.isAIGenerated === nextProps.label.isAIGenerated &&
      prevProps.isActive === nextProps.isActive &&
      prevProps.hotkey === nextProps.hotkey
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
    activeLabelId,
    hotkeyByLabelId,
  }: {
    category: string
    labels: Label[]
    onLabelSelect: (label: Label) => void
    activeLabelId: string | null
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
                isActive={label.id === activeLabelId}
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
  ({ labelGroup, onLabelSelect, activeLabelId, hotkeyByLabelId }: LabelListProps) => {
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
                  activeLabelId={activeLabelId}
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
