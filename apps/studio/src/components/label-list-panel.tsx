import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Label } from "@vailabel/core"
import { useLabelStore } from "@/hooks/use-label-store"
import { useProjectStore } from "@/hooks/use-project-store"
import { useEffect } from "react"

interface LabelListPanelProps {
  onLabelSelect: (label: Label) => void
}

export function LabelListPanel({ onLabelSelect }: LabelListPanelProps) {
  const { labels, getLabelsByProjectId } = useLabelStore()
  const { currentProject } = useProjectStore()
  const groupedLabels: Record<string, Label[]> = labels.reduce(
    (acc, label) => {
      const category = label.category || "Uncategorized"
      if (!acc[category]) acc[category] = []
      acc[category].push(label)
      return acc
    },
    {} as Record<string, Label[]>
  )

  useEffect(() => {
    if (currentProject) {
      getLabelsByProjectId(currentProject.id)
    }
  }, [currentProject, getLabelsByProjectId])

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
          "px-4 py-2 border-b",
          "dark:border-gray-700",
          "border-gray-200"
        )}
      >
        <h2 className="text-lg font-semibold">Labels</h2>
        <p className={cn("text-sm", "dark:text-gray-400", "text-gray-500")}>
          {labels.length} total
        </p>
      </div>

      <ScrollArea className="h-[calc(100%-65px)]">
        <div className="p-2 ">
          <div className="space-y-4">
            {Object.entries(groupedLabels).map(([category, group]) => (
              <Collapsible key={category} defaultOpen className="mb-4">
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full flex items-center justify-between px-2 py-1 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 pl-1 gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                      {category}
                    </div>
                    <span className="text-xs">{group.length}</span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2">
                    {group.map((label) => (
                      <motion.div
                        key={label.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "rounded-lg border p-3 cursor-pointer flex flex-col gap-1 transition-colors duration-150",
                          "dark:border-gray-700 dark:hover:bg-gray-700 border-gray-200 hover:bg-gray-50",
                          label.isAIGenerated
                            ? "ring-2 ring-green-200 dark:ring-green-700"
                            : ""
                        )}
                        onClick={() => onLabelSelect(label)}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            style={{ backgroundColor: label.color }}
                            className={cn(
                              "h-4 w-4 rounded-full border-2 border-white shadow-sm",
                              label.isAIGenerated
                                ? "ring-2 ring-green-400 dark:ring-green-600"
                                : ""
                            )}
                          />
                          <span className="text-sm font-medium truncate max-w-[120px]">
                            {label.name}
                          </span>
                          {label.isAIGenerated && (
                            <span className="ml-2 px-2 py-0.5 rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs font-semibold flex items-center gap-1">
                              <span className="text-base leading-none">🤖</span>{" "}
                              AI
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
          {labels.length === 0 && (
            <div
              className={cn(
                "mt-2 rounded-md border border-dashed p-4 text-center",
                "dark:border-gray-700",
                "border-gray-300"
              )}
            >
              <p
                className={cn("text-sm", "dark:text-gray-400", "text-gray-500")}
              >
                No labels created yet
              </p>
              <p
                className={cn("text-xs", "dark:text-gray-500", "text-gray-400")}
              >
                Use the drawing tools to create labels
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
