"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ChevronRight, ChevronDown, ImageIcon, Tag } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useLabelStore } from "@/lib/store"
import type { Project, Label } from "@/lib/types"

interface SidebarProps {
  project: Project
  currentImageIndex: number
  onImageSelect: (index: number) => void
  onLabelSelect: (label: Label) => void
}

export function Sidebar({ project, currentImageIndex, onImageSelect, onLabelSelect }: SidebarProps) {
  const [imagesOpen, setImagesOpen] = useState(true)
  const [labelsOpen, setLabelsOpen] = useState(true)

  const { labels } = useLabelStore()

  // Group labels by category
  const labelsByCategory: Record<string, Label[]> = {}
  labels.forEach((label) => {
    const category = label.category || "Uncategorized"
    if (!labelsByCategory[category]) {
      labelsByCategory[category] = []
    }
    labelsByCategory[category].push(label)
  })

  return (
    <div className="w-64 border-l border-gray-200 bg-white">
      <div className="p-4">
        <h2 className="text-lg font-semibold">{project.name}</h2>
        <p className="text-sm text-gray-500">{project.images.length} images</p>
      </div>

      <Separator />

      <ScrollArea className="h-[calc(100vh-9rem)]">
        <div className="p-4">
          <Collapsible open={imagesOpen} onOpenChange={setImagesOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="flex w-full items-center justify-between p-2">
                <div className="flex items-center">
                  <ImageIcon className="mr-2 h-4 w-4" />
                  <span>Images</span>
                </div>
                {imagesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-1">
                {project.images.map((image, index) => (
                  <Button
                    key={image.id}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-left text-sm",
                      currentImageIndex === index && "bg-blue-50 text-blue-500",
                    )}
                    onClick={() => onImageSelect(index)}
                  >
                    <div className="flex items-center">
                      <div
                        className={cn(
                          "mr-2 h-2 w-2 rounded-full",
                          // Check if this image has any labels
                          labels.some((label) => label.imageId === image.id) ? "bg-green-500" : "bg-gray-300",
                        )}
                      />
                      <span className="truncate">{image.name}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator className="my-4" />

          <Collapsible open={labelsOpen} onOpenChange={setLabelsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="flex w-full items-center justify-between p-2">
                <div className="flex items-center">
                  <Tag className="mr-2 h-4 w-4" />
                  <span>Labels</span>
                </div>
                {labelsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              {Object.entries(labelsByCategory).map(([category, categoryLabels]) => (
                <div key={category} className="mt-4">
                  <h3 className="mb-2 text-xs font-medium text-gray-500">{category}</h3>
                  <div className="space-y-1">
                    {categoryLabels.map((label) => (
                      <motion.div
                        key={label.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-md border border-gray-200 p-2"
                        onClick={() => onLabelSelect(label)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div
                              className={cn(
                                "mr-2 h-3 w-3 rounded-full",
                                label.type === "box" ? "bg-blue-500" : "bg-green-500",
                              )}
                            />
                            <span className="text-sm font-medium">{label.name}</span>
                          </div>
                          <span className="text-xs text-gray-500">{label.type}</span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500 truncate">{label.coordinates.length} points</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}

              {labels.length === 0 && (
                <div className="mt-2 rounded-md border border-dashed border-gray-300 p-4 text-center">
                  <p className="text-sm text-gray-500">No labels created yet</p>
                  <p className="text-xs text-gray-400">Use the drawing tools to create labels</p>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  )
}
