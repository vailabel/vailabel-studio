import { useContext } from "react"
import { DataAccessContext } from "@/contexts/data-access-context"
import { IDataAccess } from "@vailabel/core/src/data"

export const useDataAccess = (): IDataAccess => {
  const context = useContext(DataAccessContext)
  if (!context) {
    throw new Error("useDataAccess must be used within a DataAccessProvider")
  }
  return context.dataAccess
}
