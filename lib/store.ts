import { create } from "zustand"
import { db } from "./db"
import type { Label } from "./types"

interface LabelPrompt {
  isOpen: boolean
  onSubmit: (name: string, category: string, color: string) => void
  onCancel: () => void
}

interface LabelState {
  labels: Label[]
  history: Label[][]
  historyIndex: number
  labelPrompt: LabelPrompt | null
  getLabels: () => Promise<void>
  setLabels: (labels: Label[]) => void
  addLabel: (label: Label) => void
  updateLabel: (id: string, updatedLabel: Label) => void
  removeLabel: (id: string) => void
  clearLabels: () => void
  undoAction: () => void
  redoAction: () => void
  setLabelPrompt: (prompt: LabelPrompt | null) => void
  canUndo: boolean
  canRedo: boolean
}

export const useLabelStore = create<LabelState>((set, get) => ({
  labels: [],
  history: [[]],
  historyIndex: 0,
  labelPrompt: null,
  canUndo: false,
  canRedo: false,

  setLabels: (labels) => {
    set({
      labels,
      history: [labels],
      historyIndex: 0,
      canUndo: false,
      canRedo: false,
    })
  },

  getLabels: async () => {
    // Fetch labels from the database
    try {
      const labels = await db.labels.toArray()
      set({ labels })
    } catch (error) {
      console.error("Failed to fetch labels from database:", error)
    }
  },

  addLabel: async (label) => {
    const { labels, history, historyIndex } = get()
    const newLabels = [...labels, label]

    // Add to history, removing any future states if we're in the middle of history
    const newHistory = [...history.slice(0, historyIndex + 1), newLabels]

    // Save to database
    try {
      await db.labels.add(label)
    } catch (error) {
      console.error("Failed to save label to database:", error)
    }

    set({
      labels: newLabels,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      canUndo: newHistory.length > 1,
      canRedo: false,
    })
  },

  updateLabel: async (id, updatedLabel) => {
    const { labels, history, historyIndex } = get()
    const newLabels = labels.map((label) =>
      label.id === id ? updatedLabel : label
    )

    // Add to history
    const newHistory = [...history.slice(0, historyIndex + 1), newLabels]

    // Update in database
    try {
      await db.labels.update(id, { ...updatedLabel })
    } catch (error) {
      console.error("Failed to update label in database:", error)
    }

    set({
      labels: newLabels,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      canUndo: newHistory.length > 1,
      canRedo: false,
    })
  },

  removeLabel: async (id) => {
    const { labels, history, historyIndex } = get()
    const newLabels = labels.filter((label) => label.id !== id)

    // Add to history
    const newHistory = [...history.slice(0, historyIndex + 1), newLabels]

    // Remove from database
    try {
      await db.labels.delete(id)
    } catch (error) {
      console.error("Failed to delete label from database:", error)
    }

    set({
      labels: newLabels,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      canUndo: newHistory.length > 1,
      canRedo: false,
    })
  },

  clearLabels: () => {
    const { history, historyIndex } = get()

    // Add to history
    const newHistory = [...history.slice(0, historyIndex + 1), []]

    set({
      labels: [],
      history: newHistory,
      historyIndex: newHistory.length - 1,
      canUndo: newHistory.length > 1,
      canRedo: false,
    })
  },

  undoAction: async () => {
    const { history, historyIndex } = get()

    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      const previousLabels = history[newIndex]
      const currentLabels = history[historyIndex]

      // Find labels that were removed in the previous state
      const removedLabels = currentLabels.filter(
        (current) => !previousLabels.some((prev) => prev.id === current.id)
      )

      // Delete removed labels from database
      try {
        for (const label of removedLabels) {
          await db.labels.delete(label.id)
        }
      } catch (error) {
        console.error("Failed to delete labels during undo:", error)
      }

      // Update or add labels from previous state
      try {
        for (const label of previousLabels) {
          await db.labels.put(label)
        }
      } catch (error) {
        console.error("Failed to update labels during undo:", error)
      }

      set({
        labels: previousLabels,
        historyIndex: newIndex,
        canUndo: newIndex > 0,
        canRedo: true,
      })
    }
  },

  redoAction: async () => {
    const { history, historyIndex } = get()

    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      const nextLabels = history[newIndex]
      const currentLabels = history[historyIndex]

      // Find labels that were added in the next state
      const addedLabels = nextLabels.filter(
        (next) => !currentLabels.some((current) => current.id === next.id)
      )

      // Add new labels to database
      try {
        for (const label of addedLabels) {
          await db.labels.put(label)
        }
      } catch (error) {
        console.error("Failed to add labels during redo:", error)
      }

      // Update or delete labels for next state
      try {
        for (const currentLabel of currentLabels) {
          const exists = nextLabels.some((next) => next.id === currentLabel.id)
          if (!exists) {
            await db.labels.delete(currentLabel.id)
          }
        }
      } catch (error) {
        console.error("Failed to update labels during redo:", error)
      }

      set({
        labels: nextLabels,
        historyIndex: newIndex,
        canUndo: true,
        canRedo: newIndex < history.length - 1,
      })
    }
  },

  setLabelPrompt: (prompt) => {
    set({ labelPrompt: prompt })
  },
}))
