import { AIModel } from "@vailabel/core"
import { create } from "zustand"
import { exceptionMiddleware } from "./exception-middleware"
import { IDataAdapter } from "@/adapters/data/IDataAdapter"

type AIModelStoreType = {
  data: IDataAdapter
    initDataAdapter: (dataAdapter: IDataAdapter) => void
    
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
    data: {} as IDataAdapter,
    initDataAdapter: (dataAdapter) => set({ data: dataAdapter }),

    aiModels: [],
    selectedModel: null,
    setAIModels: (aiModels) => set({ aiModels }),
    getAIModels: async () => {
      const { data } = get()
      const allAIModels = await data.fetchAIModels('defaultProjectId') // Replace with actual project ID
      set({ aiModels: allAIModels })
      return allAIModels
    },
    createAIModel: async (aiModel) => {
      const { data } = get()
      await data.saveAIModel(aiModel)
      set((state) => ({
        aiModels: [...state.aiModels, aiModel],
      }))
    },
    updateAIModel: async (id, updates) => {
      const { data } = get()
      await data.updateAIModel(id, updates)
      set((state) => ({
        aiModels: state.aiModels.map((model) =>
          model.id === id ? { ...model, ...updates } : model
        ),
      }))
    },
    deleteAIModel: async (id) => {
      const { data } = get()
      await data.deleteAIModel(id)
      set((state) => ({
        aiModels: state.aiModels.filter((model) => model.id !== id),
      }))
    },

    getSelectedModel: async () => {
      // TODO: Implement logic to get the selected AI model
      const { selectedModel } = get()
      if (selectedModel) {
        return selectedModel
      }
      const aiModels = await get().getAIModels()
      if (aiModels.length > 0) {
        set({ selectedModel: aiModels[0] }) // Default to the first model if none is selected
        return aiModels[0]
      }
      return null
    },
  }))
)
