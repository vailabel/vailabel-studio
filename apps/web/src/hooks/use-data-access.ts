import { useContext } from "react"
import { DataAccessContext } from "@/contexts/data-access-context"
import type { IDataAccess } from "@/lib/data-access"

export const useDataAccess = (): IDataAccess => {
  const context = useContext(DataAccessContext)
  if (!context) {
    throw new Error("useDataAccess must be used within a DataAccessProvider")
  }
  return context.dataAccess
}
