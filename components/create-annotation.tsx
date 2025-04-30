"use client"

import type React from "react"
import { useEffect, useState, useMemo, useCallback } from "react"
import { motion } from "framer-motion"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getRandomColor } from "@/lib/utils"
import { useUIStore } from "@/lib/ui-store"

export function CreateAnnotation() {
  const [labelName, setLabelName] = useState("")
  const [labelColor, setLabelColor] = useState("blue")

  const { createAnnotationModal, setCreateAnnotationModal } = useUIStore()

  useEffect(() => {
    if (createAnnotationModal) {
      setLabelName("")
      setLabelColor(getRandomColor())
    }
  }, [createAnnotationModal])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (labelName.trim()) {
        createAnnotationModal?.onSubmit(labelName.trim())
        setCreateAnnotationModal(null)
      }
    },
    [labelName, labelColor, createAnnotationModal, setCreateAnnotationModal]
  )

  const handleCancel = useCallback(() => {
    createAnnotationModal?.onCancel()
    setCreateAnnotationModal(null)
  }, [createAnnotationModal, setCreateAnnotationModal])

  if (!createAnnotationModal) return null

  return (
    <motion.div
      className="absolute w-full max-w-md rounded-lg bg-white p-4 shadow-xl dark:bg-gray-800 dark:text-gray-100 mt-14 ml-2"
      initial={{ scale: 0.9, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.9, y: 20 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Annotation Editor</h3>
        <Button variant="default" size="icon" onClick={handleCancel}>
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Input
              id="label-name"
              type="text"
              value={labelName}
              onChange={(e) => setLabelName(e.target.value)}
              placeholder="Enter a label name"
              autoFocus
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 *:placeholder:text-gray-400"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={!labelName.trim()}>
              Save (Enter)
            </Button>
          </div>
        </div>
      </form>
    </motion.div>
  )
}
