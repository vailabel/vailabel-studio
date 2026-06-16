import { memo } from "react"
import { Trash2, ImageIcon, CheckCircle } from "lucide-react"
import { Button } from "@/shared/ui/button"
import { Badge } from "@/shared/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip"
import { cn } from "@/shared/lib/utils"
import { toAssetUrl } from "@/shared/lib/desktop"

interface ImageGridProps {
  images: Array<{
    id: string
    name: string
    path: string
    width: number
    height: number
    size?: number
  }>
  onRemove: (index: number) => void
  className?: string
}

export const ImageGrid = memo(
  ({ images, onRemove, className }: ImageGridProps) => {
    if (images.length === 0) return null

    return (
      <TooltipProvider>
        <div className={cn("space-y-6", className)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Selected Images
                </h3>
                <p className="text-sm text-muted-foreground">
                  {images.length} image{images.length !== 1 ? "s" : ""} ready
                  for annotation
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="px-3 py-1">
              {images.length} files
            </Badge>
          </div>

          <div className="grid max-h-80 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto p-2 bg-muted/20 rounded-lg border border-muted/50">
            {images.map((image, index) => (
              <div
                key={image.id}
                className="group relative rounded-xl border-2 border-muted/50 bg-card shadow-sm overflow-hidden hover:shadow-md transition-all duration-200 hover:border-primary/30 animate-in fade-in slide-in-from-bottom-4"
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
              >
                <div className="relative">
                  <img
                    src={image.path ? toAssetUrl(image.path) : "/placeholder.svg"}
                    alt={image.name}
                    className="h-32 w-full object-cover"
                    loading="lazy"
                  />

                  <div className="absolute top-2 right-2">
                    <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center shadow-sm">
                      <CheckCircle className="w-4 h-4 text-success-foreground" />
                    </div>
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 bg-black/60 backdrop-blur-sm">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-10 w-10 shadow-lg hover:shadow-xl"
                            onClick={(e) => {
                              e.stopPropagation()
                              onRemove(index)
                            }}
                          />
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Remove image</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                <div className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span
                      className="text-xs font-medium text-foreground truncate"
                      title={image.name}
                    >
                      {image.name.length > 18
                        ? `${image.name.substring(0, 18)}...`
                        : image.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {image.width} × {image.height}
                    </span>
                    {image.size && (
                      <span>{(image.size / 1024 / 1024).toFixed(1)}MB</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </TooltipProvider>
    )
  }
)

ImageGrid.displayName = "ImageGrid"
