import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { ChevronRight, ChevronDown, Tag } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Label } from "@/lib/types"
import { useAnnotations } from "@/hooks/use-annotations"

interface LabelListPanelProps {
  onLabelSelect: (label: Label) => void
}

export function LabelListPanel({ onLabelSelect }: LabelListPanelProps) {
  const [labelsOpen, setLabelsOpen] = useState(true)
  const { labels } = useAnnotations()
  useEffect(() => {
    if (labels.length > 0) {
      setLabelsOpen(true)
    }
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
          <Collapsible open={labelsOpen} onOpenChange={setLabelsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="flex w-full items-center justify-between p-2"
              >
                <div className="flex items-center">
                  <Tag className="mr-2 h-4 w-4" />
                  <span>All Labels</span>
                </div>
                {labelsOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-1">
                {labels.map((label) => (
                  <motion.div
                    key={label.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-md border p-2 cursor-pointer dark:border-gray-700 dark:hover:bg-gray-700 border-gray-200 hover:bg-gray-50"
                    onClick={() => onLabelSelect(label)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div
                          style={{
                            backgroundColor: label.color,
                          }}
                          className={cn(
                            "mr-2 h-3 w-3 rounded-full",
                            label.isAIGenerated ? "bg-green-500" : ``
                          )}
                        />
                        <span className="text-sm font-medium">
                          {label.name}
                        </span>
                      </div>
                    </div>
                    <p
                      className={cn(
                        "mt-1 text-xs truncate",
                        "dark:text-gray-400",
                        "text-gray-500"
                      )}
                    >
                      {label.isAIGenerated && "🤖 "}
                    </p>
                  </motion.div>
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
                    className={cn(
                      "text-sm",
                      "dark:text-gray-400",
                      "text-gray-500"
                    )}
                  >
                    No labels created yet
                  </p>
                  <p
                    className={cn(
                      "text-xs",
                      "dark:text-gray-500",
                      "text-gray-400"
                    )}
                  >
                    Use the drawing tools to create labels
                  </p>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  )
}
