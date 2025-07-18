import type React from "react"
import { useState, useCallback, useEffect, useMemo, memo } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { CornerDownLeft, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getRandomColor, rgbToRgba } from "@/lib/utils"

interface CreateAnnotationModalProps {
  onSubmit: (name: string, color: string, category?: string) => void
  isOpen: boolean
  onClose: () => void
  labels: Label[]
}

interface Label {
  id: string
  name: string
  color: string
}

const filterLabels = (labelName: string, labels: Label[]) => {
  if (!labelName.trim()) return labels
  return labels.filter((label) =>
    label.name.toLowerCase().includes(labelName.toLowerCase())
  )
}

export const LabelButton = memo(
  ({
    label,
    onClick,
  }: {
    label: Label
    onClick: (name: string, color: string) => void
  }) => {
    return (
      <button
        onClick={() => onClick(label.name, label.color)}
        key={label.id}
        className="flex items-center justify-between p-2 border rounded-md cursor-pointer hover:shadow-md dark:border-gray-600"
        style={{
          backgroundColor: rgbToRgba(label.color, 0.2),
          borderColor: label.color,
        }}
      >
        <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
          {label.name}
        </span>
      </button>
    )
  }
)

// --- LabelButtonList component ---
const LabelButtonList = memo(
  ({
    labels,
    onClick,
  }: {
    labels: Label[]
    onClick: (name: string, color: string) => void
  }) => {
    return (
      <div className="grid grid-cols-2 gap-2">
        {labels.map((label) => (
          <LabelButton key={label.id} label={label} onClick={onClick} />
        ))}
      </div>
    )
  }
)

export const CreateAnnotation = memo(
  ({
    onSubmit,
    isOpen,
    onClose,
    labels,
  }: Readonly<CreateAnnotationModalProps>) => {
    const [labelName, setLabelName] = useState("")
    const [color, setColor] = useState<string>(getRandomColor())

    useEffect(() => {
      if (isOpen) {
        setLabelName("")
        setColor(getRandomColor())
      }
    }, [isOpen])

    const labelFilter = useMemo(
      () => filterLabels(labelName, labels),
      [labelName, labels]
    )

    const saveLabel = useCallback(
      (name: string, color: string) => {
        onSubmit(name, color)
        setLabelName("")
        setColor(getRandomColor())
      },
      [onSubmit]
    )

    const handleSubmit = useCallback(
      (e?: React.FormEvent | React.MouseEvent) => {
        if (e) e.preventDefault()
        if (!labelName.trim()) return
        saveLabel(labelName.trim(), color)
      },
      [color, labelName, saveLabel]
    )

    const handleChangeName = useCallback(
      (name: string) => {
        setLabelName(name)
        if (name.trim() && labels.length > 0) {
          const found = labels.find(
            (l) => l.name.toLowerCase() === name.trim().toLowerCase()
          )
          if (found) {
            setColor(found.color)
          }
        } else if (!name.trim()) {
          setColor(getRandomColor())
        }
      },
      [labels]
    )

    if (!isOpen) return null

    return (
      <AnimatePresence>
        <motion.div
          className="absolute w-full max-w-sm rounded-lg bg-white p-3 shadow-lg dark:bg-gray-800 dark:text-gray-100 top-2 left-2 z-50"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Annotation Editor</h3>
            <Button
              variant="default"
              size="icon"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
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
              {labelFilter.length > 0 ? (
                <LabelButtonList labels={labelFilter} onClick={saveLabel} />
              ) : (
                labelName.trim() && (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="flex items-center justify-between p-2 border rounded-md cursor-pointer hover:shadow-md dark:border-gray-600"
                    style={{
                      backgroundColor: rgbToRgba(color, 0.2),
                      borderColor: color,
                    }}
                  >
                    <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                      Create New {labelName}
                    </span>
                  </button>
                )
              )}
            </div>
          </form>
        </motion.div>
      </AnimatePresence>
    )
  }
)
