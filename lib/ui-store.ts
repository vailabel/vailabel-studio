import { create } from "zustand"

interface UIState {
  isAnnotationPanelOpen: boolean
  setIsAnnotationPanelOpen: (isOpen: boolean) => void
  onSubmitCreateAnnotation: (cb: CallableFunction) => void
}

export const useUIStore = create<UIState>((set) => ({
  isAnnotationPanelOpen: false,
  setIsAnnotationPanelOpen: (isOpen) => set({ isAnnotationPanelOpen: isOpen }),
  onSubmitCreateAnnotation: (cb: CallableFunction) => {
    set({ isAnnotationPanelOpen: false })
    cb()
  },
}))
