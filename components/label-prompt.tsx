"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLabelStore } from "@/lib/store"

export function LabelPrompt() {
  const { labelPrompt, setLabelPrompt } = useLabelStore()
  const [labelName, setLabelName] = useState("")
  const [category, setCategory] = useState("uncategorized")

  const categories = ["Person", "Vehicle", "Animal", "Object", "Building", "Plant", "Other"]

  useEffect(() => {
    if (labelPrompt?.isOpen) {
      setLabelName("")
      setCategory("uncategorized")
    }
  }, [labelPrompt?.isOpen])

  if (!labelPrompt?.isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (labelName.trim()) {
      labelPrompt.onSubmit(labelName.trim(), category)
      setLabelPrompt(null)
    }
  }

  const handleCancel = () => {
    labelPrompt.onCancel()
    setLabelPrompt(null)
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleCancel}
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
          <Button variant="ghost" size="icon" onClick={handleCancel}>
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
              <Label htmlFor="label-category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="label-category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uncategorized">Uncategorized</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={handleCancel}>
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
