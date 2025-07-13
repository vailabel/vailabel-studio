"use client"

import type React from "react"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import { X, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Upload Image</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        <div className="mt-4">
          {!preview ? (
            <div
              role="button"
              className={`flex h-64 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed ${
                isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="mb-2 h-10 w-10 text-gray-400" />
              <p className="mb-2 text-sm font-medium text-gray-700">
                Drag and drop an image, or click to browse
              </p>
              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
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
              <div className="relative h-64 w-full overflow-hidden rounded-lg border border-gray-200">
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

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleUpload}>Use Image</Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
