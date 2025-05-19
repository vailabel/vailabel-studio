import React, { createContext, useMemo } from "react"
import {
  ApiDataAccess,
  DexieDataAccess,
  SQLiteDataAccess,
  IDataAccess,
} from "@vailabel/core/src/data"
import { isElectron } from "../lib/constants"

interface DataAccessContextType {
  dataAccess: IDataAccess
}

export const DataAccessContext = createContext<
  DataAccessContextType | undefined
>(undefined)

// Exported for testing
export const dataAccessStrategies: Record<
  "api" | "dexie" | "sqlite",
  () => IDataAccess
> = {
  api: () => new ApiDataAccess(),
  dexie: () => new DexieDataAccess(),
  sqlite: () => {
    if (!isElectron()) {
      throw new Error("SQLite is only supported in Electron environment")
    }
    return new SQLiteDataAccess()
  },
}

// Exported for testing
export function getDefaultType(): "api" | "dexie" | "sqlite" {
  if (typeof window === "undefined") return "api" // Node.js/SSR/Cloud
  if (isElectron()) return "sqlite" // Electron desktop
  return "dexie" // Web browser (IndexedDB)
}

interface DataAccessProviderProps {
  type?: "api" | "dexie" | "sqlite"
  children: React.ReactNode
}

export const DataAccessProvider: React.FC<DataAccessProviderProps> = ({
  type,
  children,
}) => {
  const resolvedType = isElectron() ? "sqlite" : type || getDefaultType()
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
