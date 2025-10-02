import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Label } from "@vailabel/core"
import { useLabels } from "@/hooks/useFastAPIQuery"
import { memo, useMemo, useCallback, useState } from "react"

interface LabelListPanelProps {
  onLabelSelect: (label: Label) => void
  projectId: string
}

export const LabelListPanel = memo(
  ({ onLabelSelect, projectId }: LabelListPanelProps) => {
    const { data: labels = [], isLoading } = useLabels(projectId)

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

    return (
      <div
        className={cn(
          "h-full border-l",
          "dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100",
          "bg-white border-gray-200"
        )}
      >
        <div
          className={cn(
            "px-4 py-3 border-b",
            "dark:border-gray-700",
            "border-gray-200"
          )}
        >
          <h2 className="text-lg font-semibold">Labels</h2>
          <p className={cn("text-sm", "dark:text-gray-400", "text-gray-500")}>
            {isLoading ? "Loading..." : `${labels.length} total`}
          </p>
        </div>

        <ScrollArea className="h-[calc(100%-73px)]">
          {isLoading ? (
            <LoadingSkeleton />
          ) : (
            <LabelList
              labelGroup={groupedLabels}
              onLabelSelect={onLabelSelect}
            />
          )}
        </ScrollArea>
      </div>
    )
  },
  // Custom comparison function to ensure re-render when props change
  (prevProps, nextProps) => {
    return (
      prevProps.projectId === nextProps.projectId &&
      prevProps.onLabelSelect === nextProps.onLabelSelect
    )
  }
)

LabelListPanel.displayName = "LabelListPanel"

interface LabelListProps {
  labelGroup: Record<string, Label[]>
  onLabelSelect: (label: Label) => void
}

// Loading skeleton component
const LoadingSkeleton = memo(() => (
  <div className="p-4 space-y-4">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="space-y-2">
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="space-y-2 pl-4">
          {Array.from({ length: 2 }).map((_, j) => (
            <div
              key={j}
              className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"
            />
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
  }: {
    label: Label
    onLabelSelect: (label: Label) => void
  }) => {
    const handleClick = useCallback(() => {
      onLabelSelect(label)
    }, [label, onLabelSelect])

    return (
      <div
        key={label.id}
        className={cn(
          "rounded-lg border p-3 cursor-pointer flex flex-col gap-1 transition-all duration-200 hover:scale-[1.02]",
          "dark:border-gray-700 dark:hover:bg-gray-700 border-gray-200 hover:bg-gray-50",
          "hover:shadow-sm dark:hover:shadow-gray-900/20",
          label.isAIGenerated
            ? "ring-2 ring-green-200 dark:ring-green-700 bg-green-50/50 dark:bg-green-900/10"
            : ""
        )}
        onClick={handleClick}
      >
        <div className="flex items-center gap-2">
          <div
            style={{ backgroundColor: label.color }}
            className={cn(
              "h-4 w-4 rounded-full border-2 border-white shadow-sm flex-shrink-0",
              label.isAIGenerated
                ? "ring-2 ring-green-400 dark:ring-green-600"
                : ""
            )}
          />
          <span className="text-sm font-medium truncate flex-1 min-w-0">
            {label.name}
          </span>
          {label.isAIGenerated && (
            <span className="ml-2 px-2 py-0.5 rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs font-semibold flex items-center gap-1 flex-shrink-0 transition-all duration-200">
              <span className="text-base leading-none">🤖</span> AI
            </span>
          )}
        </div>
      </div>
    )
  },
  (prevProps, nextProps) => {
    // Only re-render if the label has actually changed
    return (
      prevProps.label.id === nextProps.label.id &&
      prevProps.label.name === nextProps.label.name &&
      prevProps.label.color === nextProps.label.color &&
      prevProps.label.isAIGenerated === nextProps.label.isAIGenerated
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
  }: {
    category: string
    labels: Label[]
    onLabelSelect: (label: Label) => void
  }) => {
    const [isOpen, setIsOpen] = useState(true)

    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-4">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between px-2 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 pl-1 gap-2 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 flex items-center justify-center transition-transform duration-200 hover:rotate-90">
                ▼
              </div>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600"></span>
              {category}
            </div>
            <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
              {labels.length}
            </span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-2 transition-all duration-200">
            {labels.map((label) => (
              <LabelItem
                key={label.id}
                label={label}
                onLabelSelect={onLabelSelect}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    )
  }
)

CategorySection.displayName = "CategorySection"

const LabelList = memo(({ labelGroup, onLabelSelect }: LabelListProps) => {
  const hasLabels = Object.keys(labelGroup).length > 0

  return (
    <div className="p-4">
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
              />
            ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  )
})

LabelList.displayName = "LabelList"

// Improved empty state component
const EmptyState = memo(() => (
  <div
    className={cn(
      "mt-8 rounded-lg border border-dashed p-8 text-center transition-all duration-200",
      "dark:border-gray-700 dark:bg-gray-800/50",
      "border-gray-300 bg-gray-50/50"
    )}
  >
    <div className="mx-auto w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-4">
      <span className="text-2xl">🏷️</span>
    </div>
    <h3
      className={cn(
        "text-sm font-medium mb-2",
        "dark:text-gray-300",
        "text-gray-700"
      )}
    >
      No labels created yet
    </h3>
    <p className={cn("text-xs", "dark:text-gray-500", "text-gray-400")}>
      Use the drawing tools to create your first label
    </p>
  </div>
))

EmptyState.displayName = "EmptyState"
