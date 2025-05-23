import { IDBContext, AIModel } from "@vailabel/core"
import { create } from "zustand"
import { exceptionMiddleware } from "./exception-middleware"

type AIModelStoreType = {
  dbContext: IDBContext
  initDBContext: (dbContext: IDBContext) => void
  aiModels: AIModel[]
  selectedModel: AIModel | null
  setAIModels: (aiModels: AIModel[]) => void
  getAIModels: () => Promise<AIModel[]>
  createAIModel: (aiModel: AIModel) => Promise<void>
  updateAIModel: (id: string, updates: Partial<AIModel>) => Promise<void>
  deleteAIModel: (id: string) => Promise<void>

  getSelectedModel: () => Promise<AIModel | null>
}

export const useAIModelStore = create<AIModelStoreType>(
  exceptionMiddleware((set, get) => ({
    dbContext: {} as IDBContext,
    initDBContext: (ctx) => set({ dbContext: ctx }),
    aiModels: [],
    setAIModels: (aiModels) => set({ aiModels }),

    getSelectedModel: async () => {
      const { dbContext } = get()
      if (!dbContext || !dbContext.settings || !dbContext.aiModels) return null
      const selectedModel = await dbContext.settings.getByKey("modalSelected")
      if (selectedModel) {
        const model = await dbContext.aiModels.getById(selectedModel.value)
        set({ selectedModel: model })
        return model
      }
      const allAIModels = await dbContext.aiModels.get()
      if (allAIModels.length > 0) {
        const firstModel = allAIModels[0]
        set({ selectedModel: firstModel })
        return firstModel
      }
      set({ selectedModel: null })
      return null
    },
    selectedModel: null,

    getAIModels: async () => {
      const { dbContext, setAIModels } = get()
      const allAIModels = await dbContext.aiModels.get()
      console.log("allAIModels", allAIModels)
      setAIModels(allAIModels)
      return allAIModels
    },
    createAIModel: async (aiModel) => {
      const { aiModels, dbContext } = get()
      set({ aiModels: [...aiModels, aiModel] })
      if (dbContext) {
        await dbContext.aiModels.create(aiModel)
      }
    },
    updateAIModel: async (id, updates) => {
      const { aiModels, dbContext } = get()
      const updatedAIModels = aiModels.map((model) =>
        model.id === id ? { ...model, ...updates } : model
      )
      set({ aiModels: updatedAIModels })
      if (dbContext) {
        await dbContext.aiModels.update(id, updates)
      }
    },
    deleteAIModel: async (id) => {
      const { aiModels, dbContext } = get()
      const updatedAIModels = aiModels.filter((model) => model.id !== id)
      set({ aiModels: updatedAIModels })
      if (dbContext) {
        await dbContext.aiModels.delete(id)
      }
    },
  }))
)
