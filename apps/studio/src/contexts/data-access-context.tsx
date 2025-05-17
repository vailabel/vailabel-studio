import React, { createContext, useMemo } from "react"
import type { IDataAccess } from "../lib/data-access"
import { ApiDataAccess } from "@vailabel/core/src/data/sources/api/ApiDataAccess"
import { SQLiteDataAccess } from "@vailabel/core/src/data/sources/sqlite/SQLiteDataAccess"
import { DexieDataAccess } from "@vailabel/core/src/data/sources/dexie/DexieDataAccess"
import { isElectron } from "../lib/constants"

interface DataAccessContextType {
  dataAccess: IDataAccess
}

export const DataAccessContext = createContext<
  DataAccessContextType | undefined
>(undefined)

const dataAccessStrategies: Record<string, () => IDataAccess> = {
  api: () => new ApiDataAccess(),
  dexie: () => new DexieDataAccess(),
  sqlite: () => {
    if (!isElectron()) {
      throw new Error("SQLite is only supported in Electron environment")
    }
    return new SQLiteDataAccess("vai-studio")
  },
}

function getDefaultType(): "api" | "dexie" | "sqlite" {
  if (typeof window === "undefined") return "api" // Node.js/SSR/Cloud
  if (isElectron()) return "sqlite" // Electron desktop
  return "dexie" // Web browser
}

interface DataAccessProviderProps {
  type?: "api" | "dexie" | "sqlite"
  children: React.ReactNode
}

export const DataAccessProvider: React.FC<DataAccessProviderProps> = ({
  type,
  children,
}) => {
  const resolvedType = type || getDefaultType()
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
