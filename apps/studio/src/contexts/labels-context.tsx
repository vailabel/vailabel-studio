import { createContext, useContext, useState } from "react"
import type { Label } from "@/lib/types"

const LabelsContext = createContext<{
  labels: Label[]
  setLabels: React.Dispatch<React.SetStateAction<Label[]>>
} | null>(null)

export const LabelsProvider = ({ children }: { children: React.ReactNode }) => {
  const [labels, setLabels] = useState<Label[]>([])

  return (
    <LabelsContext.Provider value={{ labels, setLabels }}>
      {children}
    </LabelsContext.Provider>
  )
}

export const useLabels = () => {
  const context = useContext(LabelsContext)
  if (!context) {
    throw new Error("useLabels must be used within a LabelsProvider")
  }
  return context
}
