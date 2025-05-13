/* eslint-disable */

import { useState } from "react"
import { motion } from "framer-motion"
import { ChevronRight, ChevronDown, ImageIcon, Tag } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import type { Project, Label } from "@/lib/types"

interface SidebarProps {
  project: Project
  currentImageIndex: number
  onImageSelect: (index: number) => void
  onLabelSelect: (label: Label) => void
}

export function Sidebar({
  project,
  currentImageIndex,
  onImageSelect,
  onLabelSelect,
}: SidebarProps) {
  const [imagesOpen, setImagesOpen] = useState(true)
  const [labelsOpen, setLabelsOpen] = useState(true)

  // Group labels by category
  const labelsByCategory: Record<string, Label[]> = {}

  return (
    <div className="w-64 border-l border-gray-200 bg-white">
      <div className="p-4">
        <h2 className="text-lg font-semibold">{project.name}</h2>
        <p className="text-sm text-gray-500">{project.images?.length} images</p>
      </div>

      <Separator />

      <ScrollArea className="h-[calc(100vh-9rem)]">
        <div className="p-4">
          <Collapsible open={imagesOpen} onOpenChange={setImagesOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="flex w-full items-center justify-between p-2"
              >
                <div className="flex items-center">
                  <ImageIcon className="mr-2 h-4 w-4" />
                  <span>Images</span>
                </div>
                {imagesOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-1">
                {project.images?.map((image, index) => (
                  <Button
                    key={image.id}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-left text-sm",
                      currentImageIndex === index && "bg-blue-50 text-blue-500"
                    )}
                    onClick={() => onImageSelect(index)}
                  >
                    <div className="flex items-center">
                      <div className={cn("mr-2 h-2 w-2 rounded-full")} />
                      <span className="truncate">{image.name}</span>
                    </div>
                  </Button>
                )) || (
                  <p className="text-sm text-gray-500">No images available</p>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator className="my-4" />

          <Collapsible open={labelsOpen} onOpenChange={setLabelsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="flex w-full items-center justify-between p-2"
              >
                <div className="flex items-center">
                  <Tag className="mr-2 h-4 w-4" />
                  <span>Labels</span>
                </div>
                {labelsOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              {Object.entries(labelsByCategory).map(
                ([category, categoryLabels]) => (
                  <div key={category} className="mt-4">
                    <h3 className="mb-2 text-xs font-medium text-gray-500">
                      {category}
                    </h3>
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
                                className={cn("mr-2 h-3 w-3 rounded-full")}
                              />
                              <span className="text-sm font-medium">
                                {label.name}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  )
}
