"use client"

import type React from "react"

import { useState, useRef } from "react"
import { X, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ImageUploaderProps {
  onUpload: (imageUrl: string, imageName: string) => void
  onClose: () => void
}

export const ImageUploader = ({ onUpload, onClose }: ImageUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (file: File) => {
    if (!file.type.match("image.*")) {
      alert("Please select an image file")
      return
    }

    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target && typeof e.target.result === "string") {
        setPreview(e.target.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = () => {
    if (preview) {
      onUpload(preview, fileName || "Untitled Image")
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Image</DialogTitle>
          <DialogDescription>
            Select an image file to upload
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {!preview ? (
            <div
              role="button"
              className={`flex h-64 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
                isDragging ? "border-primary bg-primary/10" : "border-muted-foreground/25"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="mb-2 h-10 w-10 text-muted-foreground" />
              <p className="mb-2 text-sm font-medium">
                Drag and drop an image, or click to browse
              </p>
              <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative h-64 w-full overflow-hidden rounded-lg border border-border">
                <img
                  src={preview || "/placeholder.svg"}
                  alt="Preview"
                  className="h-full w-full object-contain"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-2 top-2"
                  onClick={() => setPreview(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="image-name">Image Name</Label>
                <Input
                  id="image-name"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="Enter image name"
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleUpload}>Use Image</Button>
              </DialogFooter>
            </div>
          )}
      </DialogContent>
    </Dialog>
  )
}
