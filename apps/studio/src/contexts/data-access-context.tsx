import React, { createContext, useMemo } from "react"
import type { IDataAccess } from "../lib/data-access"
import { ApiDataAccess } from "@vai/core/data/sources/api/ApiDataAccess"
import { DexieDataAccess } from "@vai/core/data/sources/dexie/DexieDataAccess"

interface DataAccessContextType {
  dataAccess: IDataAccess
}

export const DataAccessContext = createContext<
  DataAccessContextType | undefined
>(undefined)

const dataAccessStrategies: Record<string, () => IDataAccess> = {
  api: () => new ApiDataAccess(),
  dexie: () => new DexieDataAccess(),
}
interface DataAccessProviderProps {
  type?: "api" | "dexie" // Add more types as needed
  children: React.ReactNode
}

export const DataAccessProvider: React.FC<DataAccessProviderProps> = ({
  type = "dexie",
  children,
}) => {
  const dataAccess = useMemo(() => {
    const strategy = dataAccessStrategies[type]
    if (!strategy) {
      throw new Error(`Unknown data access type: ${type}`)
    }
    return strategy()
  }, [type])

  return (
    <DataAccessContext.Provider value={{ dataAccess }}>
      {children}
    </DataAccessContext.Provider>
  )
}
