"use client"

import type React from "react"
import { useEffect, useState, useCallback } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { CornerDownLeft, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getRandomColor, rgbToRgba } from "@/lib/utils"
import { useUIStore } from "@/lib/ui-store"
import { useStore } from "@/lib/store"
import { Annotation } from "@/lib/types"

export function CreateAnnotation() {
  const [labelName, setLabelName] = useState("")
  const { annotations } = useStore()
  const { createAnnotationModal, setCreateAnnotationModal } = useUIStore()
  const [annotationsFilter, setAnnotationsFilter] = useState<Annotation[]>([])
  const [color, setColor] = useState<string | null>(null)
  const uniqueLabels = annotations.filter(
    (value, index, self) =>
      index ===
      self.findIndex((t) => t.name === value.name && t.color === value.color)
  )
  useEffect(() => {
    if (createAnnotationModal) {
      setLabelName("")

      setAnnotationsFilter(uniqueLabels)
    }
  }, [createAnnotationModal])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (labelName.trim()) {
        const existingAnnotation = uniqueLabels.find(
          (annotation) =>
            annotation.name.toLowerCase() === labelName.trim().toLowerCase()
        )
        createAnnotationModal?.onSubmit(
          labelName.trim(),
          existingAnnotation?.color || color || getRandomColor()
        )
        setCreateAnnotationModal(null)
      }
    },
    [
      labelName,
      createAnnotationModal,
      setCreateAnnotationModal,
      uniqueLabels,
      color,
    ]
  )

  const handleCancel = useCallback(() => {
    createAnnotationModal?.onCancel()
    setCreateAnnotationModal(null)
  }, [createAnnotationModal, setCreateAnnotationModal])

  const handleChangeName = useCallback(
    (name: string) => {
      setLabelName(name)
      if (name.trim()) {
        const filteredAnnotations = uniqueLabels.filter((annotation) =>
          annotation.name.toLowerCase().includes(name.toLowerCase())
        )
        setAnnotationsFilter(filteredAnnotations)
        setColor(filteredAnnotations[0]?.color || getRandomColor())
      } else {
        setAnnotationsFilter(uniqueLabels)
        setColor(null)
      }
    },
    [uniqueLabels]
  )

  if (!createAnnotationModal) return null

  return (
    <AnimatePresence>
      <motion.div
        className="absolute w-full max-w-sm rounded-lg bg-white p-3 shadow-lg dark:bg-gray-800 dark:text-gray-100 mt-14 ml-2"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Annotation Editor</h3>
          <Button variant="default" size="icon" onClick={handleCancel}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="mt-3">
          <div className="space-y-3">
            <div className="space-y-2">
              <Input
                id="label-name"
                type="text"
                value={labelName}
                onChange={(e) => handleChangeName(e.target.value)}
                placeholder="Enter a label name"
                autoFocus
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 placeholder-gray-400"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="submit"
                disabled={!labelName.trim()}
                className="bg-blue-500 text-white hover:bg-blue-600 px-3 py-1 text-md"
              >
                Save
                <CornerDownLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="mt-4">
            {annotationsFilter.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {annotationsFilter.map((annotation) => (
                  <button
                    onClick={() => {
                      setLabelName(annotation.name)
                      setAnnotationsFilter((prev) =>
                        prev.filter((a) => a.id !== annotation.id)
                      )
                      createAnnotationModal?.onSubmit(
                        annotation.name,
                        annotation.color || getRandomColor()
                      )
                      setCreateAnnotationModal(null)
                    }}
                    key={annotation.id}
                    className="flex items-center justify-between p-2 border rounded-md cursor-pointer hover:shadow-md dark:border-gray-600"
                    style={{
                      backgroundColor: rgbToRgba(
                        annotation.color || "blue",
                        0.2
                      ),
                      borderColor: annotation.color || "blue",
                    }}
                  >
                    <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                      {annotation.name}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <button
                onClick={() => {
                  setLabelName(labelName)
                  setAnnotationsFilter((prev) =>
                    prev.filter((a) => a.name !== labelName)
                  )
                  createAnnotationModal?.onSubmit(
                    labelName,
                    color || getRandomColor()
                  )
                  setCreateAnnotationModal(null)
                }}
                className="flex items-center justify-between p-2 border rounded-md cursor-pointer hover:shadow-md dark:border-gray-600"
                style={{
                  backgroundColor: rgbToRgba(color || "blue", 0.2),
                  borderColor: color || "blue",
                }}
              >
                <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                  Create New {labelName}
                </span>
              </button>
            )}
          </div>
        </form>
      </motion.div>
    </AnimatePresence>
  )
}
