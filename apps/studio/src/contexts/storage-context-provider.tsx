import React, { useState, useEffect } from "react"
import { StorageContext } from "./storage-context"
import {
  Base64StorageAdapter,
  IStorageAdapter,
  FileSystemStorageAdapter,
} from "@vailabel/core/src/storage"
import { isElectron } from "@/lib/constants"

// You may want to add more options as needed
type StorageType = "base64" | "filesystem" | "hybrid" | "azure" | "s3"

interface StorageProviderProps {
  type?: StorageType
  children?: React.ReactNode // Make children optional
  directory?: string
  azureContainerClient?: unknown
  s3Bucket?: string
  s3Client?: unknown
  hybridLocal?: IStorageAdapter
  hybridRemote?: IStorageAdapter
}

const storageStrategies: Record<
  StorageType,
  (props: StorageProviderProps) => IStorageAdapter | Promise<IStorageAdapter>
> = {
  base64: () => new Base64StorageAdapter(),
  filesystem: async (props) => {
    if (!isElectron()) {
      throw new Error(
        "FileSystem storage is only supported in Electron environment"
      )
    }
    return new FileSystemStorageAdapter(props.directory ?? ".")
  },
  hybrid: () => {
    throw new Error("Hybrid storage is not implemented yet")
  },
  azure: () => {
    throw new Error("Azure storage is not implemented yet")
  },
  s3: () => {
    throw new Error("S3 storage is not implemented yet")
  },
}

function getDefaultType(): StorageType {
  if (typeof window === "undefined") return "filesystem"
  if (isElectron()) return "filesystem"
  return "base64"
}

export const StorageProvider: React.FC<StorageProviderProps> = ({
  type,
  children,
  directory,
  azureContainerClient,
  s3Bucket,
  s3Client,
  hybridLocal,
  hybridRemote,
}) => {
  let resolvedType = type ?? getDefaultType()
  if (isElectron()) {
    resolvedType = "filesystem"
  }

  const [storage, setStorage] = useState<IStorageAdapter | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false
    const strategy = storageStrategies[resolvedType]
    if (!strategy) {
      setError(new Error(`Unknown storage type: ${resolvedType}`))
      return
    }
    const maybePromise = strategy({
      type: resolvedType,
      directory,
      azureContainerClient,
      s3Bucket,
      s3Client,
      hybridLocal,
      hybridRemote,
    })
    if (maybePromise instanceof Promise) {
      setLoading(true)
      maybePromise
        .then((adapter) => {
          if (!cancelled) {
            setStorage(adapter)
            setLoading(false)
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setError(err)
            setLoading(false)
          }
        })
    } else {
      setStorage(maybePromise)
    }
    return () => {
      cancelled = true
    }
  }, [
    resolvedType,
    directory,
    azureContainerClient,
    s3Bucket,
    s3Client,
    hybridLocal,
    hybridRemote,
  ])

  if (loading) return null // or a loading spinner
  if (error) throw error
  if (!storage) return null

  return (
    <StorageContext.Provider value={{ storage }}>
      {children}
    </StorageContext.Provider>
  )
}
