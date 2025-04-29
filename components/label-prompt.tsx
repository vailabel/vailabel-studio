"use client"

import type React from "react"
import { useEffect, useState, useMemo, useCallback } from "react"
import { motion } from "framer-motion"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useLabelStore } from "@/lib/store"
import { getRandomColor } from "@/lib/utils"

export function LabelPrompt() {
  const { labelPrompt, setLabelPrompt, labels, getLabels } = useLabelStore()
  const [labelName, setLabelName] = useState("")
  const [category, setCategory] = useState("uncategorized")
  const [labelColor, setLabelColor] = useState("blue")
  const [filteredLabels, setFilteredLabels] = useState(labels)

  useEffect(() => {
    getLabels()
    console.log("Labels fetched from database", labels)
  }, [])

  useEffect(() => {
    if (labelPrompt?.isOpen) {
      setLabelName("")
      setCategory("uncategorized")
      setLabelColor(getRandomColor())
    }
  }, [labelPrompt?.isOpen])

  useEffect(() => {
    setFilteredLabels(
      labels.filter((label) =>
        label.name.toLowerCase().includes(labelName.toLowerCase())
      )
    )
    const existingLabel = labels.find(
      (label) => label.name.toLowerCase() === labelName.toLowerCase()
    )
    if (existingLabel) {
      setLabelColor(existingLabel.color || "blue")
    } else {
      setLabelColor(getRandomColor())
    }
  }, [labelName, labels])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (labelName.trim()) {
        labelPrompt?.onSubmit(labelName.trim(), category, labelColor)
        setLabelPrompt(null)
      }
    },
    [labelName, category, labelColor, labelPrompt, setLabelPrompt]
  )

  const handleCancel = useCallback(() => {
    labelPrompt?.onCancel()
    setLabelPrompt(null)
  }, [labelPrompt, setLabelPrompt])

  if (!labelPrompt?.isOpen) return null

  return (
    <motion.div
      className="absolute w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800 dark:text-gray-100"
      initial={{ scale: 0.9, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.9, y: 20 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Annotation Editor</h3>
        <Button variant="ghost" size="icon" onClick={handleCancel}>
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
              className="dark:bg-gray-700 dark:border-gray-600"
            />
            {filteredLabels.length > 0 && (
              <ul className="mt-2 max-h-40 overflow-y-auto border border-gray-300 rounded-md dark:border-gray-600">
                {filteredLabels.map((label) => (
                  <li
                    key={label.id}
                    className="cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => setLabelName(label.name)}
                  >
                    <div className="flex items-center space-x-2">
                      <div
                        className={`h-4 w-4 rounded-full bg-${label.color} border border-gray-300`}
                      ></div>
                      <span>{label.name}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center space-x-2 mt-2">
              <div
                className={`h-4 w-4 rounded-full bg-${labelColor} border border-gray-300`}
              ></div>
              <span className="text-sm">Selected Color</span>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Delete
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
