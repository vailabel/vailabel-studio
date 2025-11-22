import { memo, useState } from "react"
import {
  Upload,
  Trash2,
  ImageIcon,
  Loader2,
  FileImage,
  CheckCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface ImageUploadAreaProps {
  onFiles: (files: File[]) => void
  isUploading: boolean
  uploadProgress?: number
  className?: string
}

export const ImageUploadArea = memo(
  ({
    onFiles,
    isUploading,
    uploadProgress = 0,
    className,
  }: ImageUploadAreaProps) => {
    const [isDragOver, setIsDragOver] = useState(false)

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
    }

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      if (e.dataTransfer.files) {
        onFiles(Array.from(e.dataTransfer.files))
      }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        onFiles(Array.from(e.target.files))
      }
    }

    return (
      <TooltipProvider>
        <Card className={cn("relative overflow-hidden border-2", className)}>
          <div
            className={cn(
              "flex h-48 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-300 relative overflow-hidden",
              isDragOver
                ? "border-primary bg-primary/10 scale-[1.02] shadow-lg shadow-primary/20"
                : "border-muted-foreground/30 bg-muted/20 hover:bg-muted/30 hover:border-muted-foreground/50 hover:shadow-md"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <div className="absolute inset-0 bg-primary/5 pointer-events-none" />

            {isUploading ? (
              <div className="flex flex-col items-center gap-4 relative z-10 animate-in fade-in duration-300">
                <div className="relative">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                </div>
                <div className="text-center space-y-3">
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-primary">
                      Processing Images...
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {uploadProgress > 0
                        ? `Uploading... ${Math.round(uploadProgress)}%`
                        : "Please wait while we prepare your files"}
                    </p>
                  </div>
                  <div className="w-48 space-y-2">
                    <Progress
                      value={uploadProgress > 0 ? uploadProgress : undefined}
                      className="h-2"
                    />
                    {uploadProgress > 0 && (
                      <p className="text-xs text-muted-foreground text-center">
                        {Math.round(uploadProgress)}% complete
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 relative z-10 animate-in fade-in duration-300">
                <div className="relative">
                  <div
                    className={cn(
                      "w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center transition-transform duration-500",
                      isDragOver && "rotate-[360deg]"
                    )}
                  >
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  {isDragOver && (
                    <div className="absolute inset-0 rounded-full border-2 border-primary animate-pulse" />
                  )}
                </div>

                <div className="text-center space-y-2">
                  <p className="text-lg font-semibold text-foreground">
                    {isDragOver ? "Drop images here" : "Upload Images"}
                  </p>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Drag and drop your images here, or click to browse your
                    files
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <Badge variant="outline" className="text-xs">
                      <FileImage className="w-3 h-3 mr-1" />
                      PNG, JPG, GIF
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Max 10MB each
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            <input
              id="file-input"
              type="file"
              className="hidden"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </div>
        </Card>
      </TooltipProvider>
    )
  }
)

ImageUploadArea.displayName = "ImageUploadArea"

interface ImageGridProps {
  images: Array<{
    id: string
    name: string
    data: string
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
                    src={image.data || "/placeholder.svg"}
                    alt={image.name}
                    className="h-32 w-full object-cover"
                    loading="lazy"
                  />

                  <div className="absolute top-2 right-2">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 bg-black/60 backdrop-blur-sm">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-10 w-10 shadow-lg hover:shadow-xl"
                          onClick={(e) => {
                            e.stopPropagation()
                            onRemove(index)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
