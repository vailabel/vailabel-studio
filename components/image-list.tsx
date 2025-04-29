"use client"

import { useState } from "react"
import { ChevronRight, ChevronDown, ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useLabelStore } from "@/lib/store"
import { useSettingsStore } from "@/lib/settings-store"
import type { Project } from "@/lib/types"

interface ImageListProps {
  project: Project
  currentImageIndex: number
  onImageSelect: (index: number) => void
}

export function ImageList({
  project,
  currentImageIndex,
  onImageSelect,
}: ImageListProps) {
  const [imagesOpen, setImagesOpen] = useState(true)
  const { labels } = useLabelStore()
  const { darkMode } = useSettingsStore()

  return (
    <div
      className={cn(
        "h-full border-r",
        darkMode
          ? "bg-gray-800 border-gray-700 text-gray-100"
          : "bg-white border-gray-200"
      )}
    >
      <div
        className={cn(
          "p-4 border-b",
          darkMode ? "border-gray-700" : "border-gray-200"
        )}
      >
        <h2 className="text-lg font-semibold">Images</h2>
        <p
          className={cn(
            "text-sm",
            darkMode ? "text-gray-400" : "text-gray-500"
          )}
        >
          {project.images.length} total
        </p>
      </div>

      <ScrollArea className="h-[calc(100%-65px)]">
        <div className="p-2">
          <Collapsible open={imagesOpen} onOpenChange={setImagesOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="flex w-full items-center justify-between p-2"
              >
                <div className="flex items-center">
                  <ImageIcon className="mr-2 h-4 w-4" />
                  <span>All Images</span>
                </div>
                {imagesOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-1 space-y-1">
                {project.images.map((image, index) => (
                  <Button
                    key={image.id}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-left text-sm",
                      currentImageIndex === index &&
                        (darkMode
                          ? "bg-blue-900 text-blue-300"
                          : "bg-blue-50 text-blue-500")
                    )}
                    onClick={() => onImageSelect(index)}
                  >
                    <div className="flex items-center">
                      <div
                        className={cn(
                          "mr-2 h-2 w-2 rounded-full",
                          // Check if this image has any labels
                          labels.some((label) => label.imageId === image.id)
                            ? "bg-green-500"
                            : "bg-gray-300"
                        )}
                      />
                      <span className="truncate">{image.name}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  )
}
