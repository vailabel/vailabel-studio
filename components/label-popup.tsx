"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface LabelPopupProps {
  onSave: (labelName: string, labelColor: string) => void
  onCancel: () => void
}

const colorOptions = [
  { value: "blue-500", label: "Blue" },
  { value: "green-500", label: "Green" },
  { value: "red-500", label: "Red" },
  { value: "yellow-500", label: "Yellow" },
  { value: "purple-500", label: "Purple" },
]

export function LabelPopup({ onSave, onCancel }: LabelPopupProps) {
  const [labelName, setLabelName] = useState("")
  const [labelColor, setLabelColor] = useState("blue-500")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (labelName.trim()) {
      onSave(labelName.trim(), labelColor)
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Add Label</h3>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label-name">Label Name</Label>
              <Input
                id="label-name"
                value={labelName}
                onChange={(e) => setLabelName(e.target.value)}
                placeholder="Enter a label name"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Label Color</Label>
              <RadioGroup value={labelColor} onValueChange={setLabelColor} className="flex flex-wrap gap-2">
                {colorOptions.map((color) => (
                  <div key={color.value} className="flex items-center space-x-2">
                    <RadioGroupItem
                      value={color.value}
                      id={`color-${color.value}`}
                      className={`border-${color.value}`}
                    />
                    <Label htmlFor={`color-${color.value}`} className="flex items-center gap-1.5">
                      <div className={`h-3 w-3 rounded-full bg-${color.value}`} />
                      {color.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={!labelName.trim()}>
                Save
              </Button>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
