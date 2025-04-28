import { create } from "zustand"
import type { Label } from "./types"

interface LabelPrompt {
  isOpen: boolean
  onSubmit: (name: string, category: string) => void
  onCancel: () => void
}

interface LabelState {
  labels: Label[]
  history: Label[][]
  historyIndex: number
  labelPrompt: LabelPrompt | null
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

  addLabel: (label) => {
    const { labels, history, historyIndex } = get()
    const newLabels = [...labels, label]

    // Add to history, removing any future states if we're in the middle of history
    const newHistory = [...history.slice(0, historyIndex + 1), newLabels]

    set({
      labels: newLabels,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      canUndo: newHistory.length > 1,
      canRedo: false,
    })
  },

  updateLabel: (id, updatedLabel) => {
    const { labels, history, historyIndex } = get()
    const newLabels = labels.map((label) => (label.id === id ? updatedLabel : label))

    // Add to history
    const newHistory = [...history.slice(0, historyIndex + 1), newLabels]

    set({
      labels: newLabels,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      canUndo: newHistory.length > 1,
      canRedo: false,
    })
  },

  removeLabel: (id) => {
    const { labels, history, historyIndex } = get()
    const newLabels = labels.filter((label) => label.id !== id)

    // Add to history
    const newHistory = [...history.slice(0, historyIndex + 1), newLabels]

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

  undoAction: () => {
    const { history, historyIndex } = get()

    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      set({
        labels: history[newIndex],
        historyIndex: newIndex,
        canUndo: newIndex > 0,
        canRedo: true,
      })
    }
  },

  redoAction: () => {
    const { history, historyIndex } = get()

    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      set({
        labels: history[newIndex],
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
