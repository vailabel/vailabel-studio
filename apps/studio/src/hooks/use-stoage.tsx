import { useContext } from "react"
import { StorageContext } from "@/contexts/storage-context"
import { IStorageAdapter } from "@/adapters/storage"

export const useStorage = (): IStorageAdapter => {
  const context = useContext(StorageContext)
  if (!context) {
    throw new Error("useStorage must be used within a StorageProvider")
  }
  return context.storage
}
