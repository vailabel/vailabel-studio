import { createContext } from "react"
import { IStorageAdapter } from "@vailabel/core/src/storage"

export interface StorageContextType {
  storage: IStorageAdapter
}

export const StorageContext = createContext<StorageContextType | undefined>(
  undefined
)
