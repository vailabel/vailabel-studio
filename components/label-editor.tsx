"use client"

import { useEffect, useState } from "react"
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
import { useLabelStore } from "@/lib/store"
import { db } from "@/lib/db"
import { useToast } from "@/hooks/use-toast"
import type { Label as LabelType } from "@/lib/types"

interface LabelEditorProps {
  label: LabelType
  onClose: () => void
}

export function LabelEditor({ label, onClose }: LabelEditorProps) {
  const { toast } = useToast()
  const { updateLabel, removeLabel, labels, getLabels} = useLabelStore()

  const [name, setName] = useState(label.name)
  const [category, setCategory] = useState(label.category || "")

  const categories = [
    "Person",
    "Vehicle",
    "Animal",
    "Object",
    "Building",
    "Plant",
    "Other",
  ]

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for this label",
        variant: "destructive",
      })
      return
    }

    try {
      const updatedLabel = {
        ...label,
        name: name.trim(),
        category: category || undefined,
        updatedAt: new Date(),
      }

      // Update in store
      updateLabel(label.id, updatedLabel)

      // Update in database
      await db.labels.update(label.id, updatedLabel)

      toast({
        title: "Label updated",
        description: "Label has been updated successfully",
      })

      onClose()
    } catch (error) {
      console.error("Error updating label:", error)
      toast({
        title: "Error",
        description: "Failed to update label",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this label?")) {
      try {
        // Remove from store
        removeLabel(label.id)

        // Remove from database
        await db.labels.delete(label.id)

        toast({
          title: "Label deleted",
          description: "Label has been deleted successfully",
        })

        onClose()
      } catch (error) {
        console.error("Error deleting label:", error)
        toast({
          title: "Error",
          description: "Failed to delete label",
          variant: "destructive",
        })
      }
    }
  }
  useEffect(() => {
    getLabels()
  }, [])

  console.log("LabelEditor rendered with label:", labels)

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Edit Label</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="label-name">Label Name</Label>
            <Input
              id="label-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter label name"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="label-category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="label-category" className="mt-1">
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

          <div>
            <Label>Label Details</Label>
            <div className="mt-1 rounded-md border border-gray-200 p-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-500">Type:</div>
                <div>{label.type}</div>

                <div className="text-gray-500">Points:</div>
                <div>{label.coordinates.length}</div>

                <div className="text-gray-500">Created:</div>
                <div>{new Date(label.createdAt).toLocaleString()}</div>

                <div className="text-gray-500">Updated:</div>
                <div>{new Date(label.updatedAt).toLocaleString()}</div>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="destructive" onClick={handleDelete}>
              Delete Label
            </Button>
            <div className="space-x-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save Changes</Button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
