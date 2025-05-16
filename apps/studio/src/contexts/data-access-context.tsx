import React, { createContext, useMemo } from "react"
import type { IDataAccess } from "../lib/data-access"
import { ApiDataAccess } from "@/data/sources/api/ApiDataAccess"
import { DexieDataAccess } from "@/data/sources/dexie/DexieDataAccess"
import { SQLiteDataAccess } from "@/data/sources/sqlite/SQLiteDataAccess"
import { isElectronEnv } from "@/lib/constants"

interface DataAccessContextType {
  dataAccess: IDataAccess
}

export const DataAccessContext = createContext<
  DataAccessContextType | undefined
>(undefined)

const dataAccessStrategies: Record<string, () => IDataAccess> = {
  api: () => new ApiDataAccess(),
  dexie: () => new DexieDataAccess(),
  sqlite: () => new SQLiteDataAccess("vailabel.db"),
}
interface DataAccessProviderProps {
  type?: "api" | "dexie" // Add more types as needed
  children: React.ReactNode
}

export const DataAccessProvider: React.FC<DataAccessProviderProps> = ({
  type,
  children,
}) => {
  // Auto-select type if not provided
  const resolvedType = type || (isElectronEnv() ? "sqlite" : "dexie")
  const dataAccess = useMemo(() => {
    const strategy = dataAccessStrategies[resolvedType]
    if (!strategy) {
      throw new Error(`Unknown data access type: ${resolvedType}`)
    }
    return strategy()
  }, [resolvedType])

  return (
    <DataAccessContext.Provider value={{ dataAccess }}>
      {children}
    </DataAccessContext.Provider>
  )
}
