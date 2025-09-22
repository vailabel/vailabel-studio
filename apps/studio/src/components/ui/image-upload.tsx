import { memo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, Trash2, ImageIcon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface ImageUploadAreaProps {
  onFiles: (files: File[]) => void
  isUploading: boolean
  className?: string
}

export const ImageUploadArea = memo(({ onFiles, isUploading, className }: ImageUploadAreaProps) => {
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
    <Card className={cn("relative overflow-hidden", className)}>
      <motion.div
        className={cn(
          "flex h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-300",
          isDragOver
            ? "border-primary bg-primary/5 scale-105"
            : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <AnimatePresence mode="wait">
          {isUploading ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center gap-2"
            >
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium text-primary">Processing...</p>
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center gap-2"
            >
              <Upload className="h-10 w-10 text-gray-500 dark:text-gray-400" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Drag and drop images, or click to browse
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                PNG, JPG, GIF up to 10MB
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        
        <input
          id="file-input"
          type="file"
          className="hidden"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          disabled={isUploading}
        />
      </motion.div>
    </Card>
  )
})

ImageUploadArea.displayName = "ImageUploadArea"

interface ImageGridProps {
  images: Array<{
    id: string
    name: string
    data: string
    width: number
    height: number
  }>
  onRemove: (index: number) => void
  className?: string
}

export const ImageGrid = memo(({ images, onRemove, className }: ImageGridProps) => {
  if (images.length === 0) return null

  return (
    <div className={cn("space-y-4", className)}>
      <h3 className="text-lg font-semibold">
        Selected Images ({images.length})
      </h3>
      <div className="grid max-h-64 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto p-1">
        <AnimatePresence>
          {images.map((image, index) => (
            <motion.div
              key={image.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className="group relative rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm overflow-hidden"
            >
              <img
                src={image.data || "/placeholder.svg"}
                alt={image.name}
                className="h-28 w-full object-cover rounded-t-lg"
                loading="lazy"
              />
              
              {/* Hover overlay */}
              <motion.div 
                className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 bg-black/50 dark:bg-black/60"
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
              >
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemove(index)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </motion.div>
              
              {/* Image info */}
              <div className="absolute bottom-0 left-0 right-0 p-2 text-xs bg-black/70 dark:bg-black/80 text-white truncate">
                <div className="flex items-center gap-1">
                  <ImageIcon className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">
                    {image.name.length > 20
                      ? `${image.name.substring(0, 20)}...`
                      : image.name}
                  </span>
                </div>
                <div className="text-xs opacity-75">
                  {image.width} × {image.height}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
})

ImageGrid.displayName = "ImageGrid"
