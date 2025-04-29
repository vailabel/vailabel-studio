import { create } from "zustand"
import { persist } from "zustand/middleware"

interface SettingsState {
  // Tool selection
  selectedTool: string
  setSelectedTool: (tool: string) => void

  // Display options
  showRulers: boolean
  setShowRulers: (show: boolean) => void
  showCrosshairs: boolean
  setShowCrosshairs: (show: boolean) => void
  showCoordinates: boolean
  setShowCoordinates: (show: boolean) => void

  // Theme
  darkMode: boolean
  setDarkMode: (dark: boolean) => void

  // Image adjustments
  brightness: number
  setBrightness: (value: number) => void
  contrast: number
  setContrast: (value: number) => void
  zoom: number
  setZoom: (value: number) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Tool selection - default to move tool
      selectedTool: "move",
      setSelectedTool: (tool) => set({ selectedTool: tool }),

      // Display options
      showRulers: true,
      setShowRulers: (show) => set({ showRulers: show }),
      showCrosshairs: true,
      setShowCrosshairs: (show) => set({ showCrosshairs: show }),
      showCoordinates: true,
      setShowCoordinates: (show) => set({ showCoordinates: show }),

      // Theme
      darkMode: false,
      setDarkMode: (dark) => set({ darkMode: dark }),

      // Image adjustments
      brightness: 100,
      setBrightness: (value) => set({ brightness: value }),
      contrast: 100,
      setContrast: (value) => set({ contrast: value }),
      zoom: 1,
      setZoom: (value) => set({ zoom: value }),
    }),
    {
      name: "image-labeler-settings", // unique name for localStorage
    }
  )
)
