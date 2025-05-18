import { useContext } from "react"
import { IStorageAdapter } from "@vailabel/core/src/storage"
import { StorageContext } from "@/contexts/storage-context"

export const useStorage = (): IStorageAdapter => {
  const context = useContext(StorageContext)
  if (!context) {
    throw new Error("useStorage must be used within a StorageProvider")
  }
  return context.storage
}
