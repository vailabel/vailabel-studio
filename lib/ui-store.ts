import { create } from "zustand"

interface CreateAnnotationModal {
  isOpen: boolean
  onSubmit: (name: string) => void
  onCancel: () => void
}

interface UIState {
  createAnnotationModal: CreateAnnotationModal | null
  setCreateAnnotationModal: (modal: CreateAnnotationModal | null) => void
}

export const useUIStore = create<UIState>((set) => ({
  createAnnotationModal: null,
  setCreateAnnotationModal: (modal) => set({ createAnnotationModal: modal }),
}))
