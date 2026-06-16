import { createContext, useContext, type ReactNode } from "react"
import { useSettingsViewModel } from "@/shared/model/settings-viewmodel"

/**
 * Shares a single settings viewmodel instance across the Settings page and all
 * of its sub-panels (MVVM: one view-model, many views). Previously each panel
 * called `useSettingsViewModel()` independently, creating disconnected copies
 * of the same state that only re-synced through backend events.
 */
type SettingsContextValue = ReturnType<typeof useSettingsViewModel>

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const viewModel = useSettingsViewModel()
  return (
    <SettingsContext.Provider value={viewModel}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider")
  }
  return context
}
