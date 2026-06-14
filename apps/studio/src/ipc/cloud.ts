import { invokeWithLogging } from "@/ipc/invoke"

export type CloudProvider = "aws" | "azure" | "gcp"

export interface CloudTestResult {
  ok: boolean
  message: string
}

export interface CloudTransferItem {
  /** Object key in the bucket (forward-slash separated). */
  key: string
  /** Absolute local file path (upload source / download destination). */
  path: string
}

export interface CloudTransferFailure {
  key: string
  error: string
}

export interface CloudBatchResult {
  succeeded: string[]
  failed: CloudTransferFailure[]
}

export interface CloudObjectMeta {
  key: string
  size: number
  lastModified: string | null
}

/**
 * Reference to a saved cloud configuration. `config` carries only the
 * non-secret fields (bucket/region/accountName/container); the backend reads
 * the matching secrets from the OS keychain by `configId`.
 */
export interface CloudConnectionRef {
  configId: string
  provider: CloudProvider
  config: Record<string, unknown>
}

const call = <T>(command: string, args?: Record<string, unknown>) =>
  invokeWithLogging<T>(command, args)

export const cloudCommands = {
  testConnection: (ref: CloudConnectionRef) =>
    call<CloudTestResult>("cloud_test_connection", { payload: ref }),
  uploadFiles: (ref: CloudConnectionRef, items: CloudTransferItem[]) =>
    call<CloudBatchResult>("cloud_upload_files", { payload: { ...ref, items } }),
  downloadFiles: (ref: CloudConnectionRef, items: CloudTransferItem[]) =>
    call<CloudBatchResult>("cloud_download_files", {
      payload: { ...ref, items },
    }),
  deleteObject: (ref: CloudConnectionRef, key: string) =>
    call<void>("cloud_delete_object", { payload: { ...ref, key } }),
  listObjects: (ref: CloudConnectionRef, prefix?: string, limit?: number) =>
    call<CloudObjectMeta[]>("cloud_list_objects", {
      payload: { ...ref, prefix, limit },
    }),
}

export type CloudCommands = typeof cloudCommands
