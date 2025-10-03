/**
 * Storage Context Provider
 * Provides storage functionality for the application
 */

import React, { createContext, useContext, ReactNode } from "react"

interface StorageContextType {
  // Add storage-related methods here as needed
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

const StorageContext = createContext<StorageContextType | undefined>(undefined)

interface StorageProviderProps {
  children: ReactNode
}

export const StorageProvider: React.FC<StorageProviderProps> = ({
  children,
}) => {
  const value: StorageContextType = {
    getItem: (key: string) => localStorage.getItem(key),
    setItem: (key: string, value: string) => localStorage.setItem(key, value),
    removeItem: (key: string) => localStorage.removeItem(key),
  }

  return (
    <StorageContext.Provider value={value}>{children}</StorageContext.Provider>
  )
}

export const useStorage = (): StorageContextType => {
  const context = useContext(StorageContext)
  if (context === undefined) {
    throw new Error("useStorage must be used within a StorageProvider")
  }
  return context
}
