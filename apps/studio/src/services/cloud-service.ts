import { cloudCommands } from "@/ipc/cloud"

/**
 * Thin service wrapper over the Rust cloud commands. Cloud I/O runs entirely in
 * the backend (no provider SDK in the renderer); secrets are read from the OS
 * keychain by config id, so they never round-trip through here.
 */
export const cloudStorageService = {
  testConnection: cloudCommands.testConnection,
  uploadFiles: cloudCommands.uploadFiles,
  downloadFiles: cloudCommands.downloadFiles,
  deleteObject: cloudCommands.deleteObject,
  listObjects: cloudCommands.listObjects,
}
