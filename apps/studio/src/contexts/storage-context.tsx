import { IStorageAdapter } from "@/adapters/storage"
import { createContext } from "react"

export interface StorageContextType {
  storage: IStorageAdapter
}

export const StorageContext = createContext<StorageContextType | undefined>(
  undefined
)
