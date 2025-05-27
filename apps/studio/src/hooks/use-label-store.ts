import { IDBContext, Label } from "@vailabel/core"
import { create } from "zustand"
import { exceptionMiddleware } from "./exception-middleware"

type LabelStoreType = {
  dbContext: IDBContext
  initDBContext: (dbContext: IDBContext) => void
  labels: Label[]
  setLabels: (labels: Label[]) => void
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
    dbContext: {} as IDBContext,
    initDBContext: (ctx) => set({ dbContext: ctx }),
    labels: [],
    setLabels: (labels) => set({ labels }),
    getLabels: () => {
      const { dbContext, labels, setLabels } = get()
      if (
        dbContext &&
        dbContext.labels &&
        typeof dbContext.labels.get === "function"
      ) {
        dbContext.labels.get().then((allLabels: Label[]) => {
          setLabels(allLabels)
        })
      }
      return labels
    },
    getLabelsByProjectId: async (projectId) => {
      const { dbContext } = get()
      const allLabel = await dbContext.labels.getByProjectId(projectId)
      set({ labels: allLabel })
      return allLabel
    },
    createLabel: async (label) => {
      const { labels, dbContext } = get()
      set({ labels: [...labels, label] })
      if (dbContext) {
        await dbContext.labels.create(label)
      }
    },
    updateLabel: async (id, updates) => {
      const { labels, dbContext } = get()
      const updatedLabels = labels.map((label) =>
        label.id === id ? { ...label, ...updates } : label
      )
      set({ labels: updatedLabels })
      if (dbContext) {
        await dbContext.labels.update(id, updates)
      }
    },
    deleteLabel: async (id) => {
      const { labels, dbContext } = get()
      const updatedLabels = labels.filter((label) => label.id !== id)
      set({ labels: updatedLabels })
      if (dbContext) {
        await dbContext.labels.delete(id)
      }
    },
    getOrCreateLabel: async (name, color, projectId) => {
      const { labels } = get()
      let label = labels.find((label) => label.name === name)
      if (!label) {
        // Provide all required Label properties
        label = {
          id: crypto.randomUUID(),
          name,
          color,
          projectId,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        await get().createLabel(label)
        // After creation, ensure the label is in the store
        const updatedLabels = get().labels
        label = updatedLabels.find((l) => l.id === label!.id)
      }
      if (!label) {
        throw new Error("Failed to get or create label")
      }
      return label!
    },
  }))
)
