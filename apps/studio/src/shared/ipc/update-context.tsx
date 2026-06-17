import { createContext, useContext, type ReactNode } from "react"
import { useAutoUpdate, type AutoUpdate } from "@/shared/ipc/useAutoUpdate"

const UpdateContext = createContext<AutoUpdate | null>(null)

/**
 * Single app-wide instance of the updater state machine. Mounted near the root
 * so the bottom banner and the Settings "Check for updates" button share one
 * check/install lifecycle instead of running independent ones.
 */
export const UpdateProvider = ({ children }: { children: ReactNode }) => {
  const update = useAutoUpdate()
  return (
    <UpdateContext.Provider value={update}>{children}</UpdateContext.Provider>
  )
}

export const useUpdate = (): AutoUpdate => {
  const ctx = useContext(UpdateContext)
  if (!ctx) {
    throw new Error("useUpdate must be used within an <UpdateProvider>")
  }
  return ctx
}
