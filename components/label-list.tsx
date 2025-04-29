"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLabelStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { Label } from "@/lib/types"

interface LabelListProps {
  labels: Label[]
}

export function LabelList({ labels }: LabelListProps) {
  const { removeLabel } = useLabelStore()

  if (labels.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-gray-300 dark:border-gray-700 p-4 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">No labels created yet</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Use the drawing tools to create labels</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {labels.map((label) => (
          <motion.div
            key={label.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="group rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={cn("h-3 w-3 rounded-full", `bg-${label.color || "blue-500"}`)} />
                <span className="font-medium dark:text-gray-100">{label.name}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => removeLabel(label.id)}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete</span>
              </Button>
            </div>
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center justify-between">
                <span>Type: {label.type}</span>
                <span>Points: {label.coordinates.length}</span>
              </div>
              <div className="mt-1 truncate">
                {label.type === "box" ? (
                  <span>
                    {Math.round(label.coordinates[0].x)},{Math.round(label.coordinates[0].y)} to{" "}
                    {Math.round(label.coordinates[1].x)},{Math.round(label.coordinates[1].y)}
                  </span>
                ) : (
                  <span>{label.coordinates.length} vertices</span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
