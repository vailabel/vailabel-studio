import { Label } from "@vailabel/core"
import { create } from "zustand"
import { exceptionMiddleware } from "./exception-middleware"
import { IDataAdapter } from "@/adapters/data/IDataAdapter"

type LabelStoreType = {
  data: IDataAdapter
  initDataAdapter: (dataAdapter: IDataAdapter) => void

  labels: Label[]
  getLabels: () => Label[]
  getLabelsByProjectId: (projectId: string) => Promise<Label[]>
  createLabel: (label: Label) => Promise<void>
  updateLabel: (id: string, updates: Partial<Label>) => Promise<void>
  deleteLabel: (id: string) => Promise<void>
  getOrCreateLabel: (
    name: string,
    color: string,
    projectId: string
  ) => Promise<Label>
}

export const useLabelStore = create<LabelStoreType>(
  exceptionMiddleware((set, get) => ({
    data: {} as IDataAdapter,
    initDataAdapter: (dataAdapter) => set({ data: dataAdapter }),

    labels: [],
    getLabels: () => {
      const { labels } = get()
      return labels
    },
    getLabelsByProjectId: async (projectId) => {
      const { data } = get()
      const labels = await data.fetchLabels(projectId)
      set({ labels })
      return labels
    },
    createLabel: async (label) => {
      const { data } = get()
      await data.saveLabel(label)
      set((state) => ({
        labels: [...state.labels, label],
      }))
    },
    updateLabel: async (id, updates) => {
      const { data } = get()
      const label = get().labels.find((l) => l.id === id)
      if (label) {
        const updatedLabel = { ...label, ...updates }
        await data.saveLabel(updatedLabel)
        set((state) => ({
          labels: state.labels.map((l) => (l.id === id ? updatedLabel : l)),
        }))
      } else {
        throw new Error(`Label with id ${id} not found`)
      }
    },
    deleteLabel: async (id) => {
      const { data } = get()
      await data.deleteLabel(id)
      set((state) => ({
        labels: state.labels.filter((l) => l.id !== id),
      }))
    },
    getOrCreateLabel: async (name, color, projectId) => {
      const existingLabels = await get().getLabelsByProjectId(projectId)
      let label = existingLabels.find(
        (l) => l.name === name && l.color === color
      )

      if (!label) {
        label = {
          id: crypto.randomUUID(),
          name,
          color,
          projectId,
          project: undefined as any,
          annotations: [],
        }
        await get().createLabel(label)
        // After creation, get the updated labels and find the new label
        const updatedLabels = await get().getLabelsByProjectId(projectId)
        label = updatedLabels.find((l) => l.name === name && l.color === color)
      }

      if (!label) {
        throw new Error("Failed to get or create label")
      }

      return label
    },
  }))
)
