import { convertFileSrc } from "@tauri-apps/api/core"
import { invokeWithLogging } from "@/shared/ipc/invoke"

export interface ScannedImage {
  name: string
  path: string
  width: number
  height: number
}

export interface DialogFilter {
  name: string
  extensions: string[]
}

export interface OpenDialogRequest {
  directory?: boolean
  multiple?: boolean
  filters?: DialogFilter[]
}

export interface SystemInfo {
  appName: string
  appVersion: string
  isDesktop: boolean
  platform: string
}

export interface UpdaterStatus {
  supported: boolean
  status: string
  message: string
}

export const isDesktopApp = () => {
  if (typeof window === "undefined") return false
  return "__TAURI_INTERNALS__" in window
}

export const getSystemInfo = async () =>
  invokeWithLogging<SystemInfo>("system_info")

export const openPathDialog = async (request: OpenDialogRequest) =>
  invokeWithLogging<string[]>("open_path_dialog", { request })

export const openExternalUrl = async (url: string) =>
  invokeWithLogging("open_external", { payload: { url } })

export const ensureDirectory = async (path: string) =>
  invokeWithLogging("fs_ensure_directory", { payload: { path } })

export const saveImageFile = async (path: string, data: string) =>
  invokeWithLogging("fs_save_image", { payload: { path, data } })

export const loadImageFile = async (path: string) =>
  invokeWithLogging<string>("fs_load_image", { payload: { path } })

export const deleteImageFile = async (path: string) =>
  invokeWithLogging("fs_delete_image", { payload: { path } })

export const listImageFiles = async (directory: string) =>
  invokeWithLogging<string[]>("fs_list_images", { payload: { directory } })

export const getBaseName = async (file: string) =>
  invokeWithLogging<string>("fs_get_base_name", { payload: { file } })

/**
 * Resolve an on-disk image path to a URL the webview can render via Tauri's
 * asset protocol. Replaces base64 data URLs entirely.
 */
export const toAssetUrl = (path: string) => convertFileSrc(path)

/** Scan a folder for image files (path + dimensions), referencing in place. */
export const scanImageDirectory = async (directory: string) =>
  invokeWithLogging<ScannedImage[]>("images_scan_directory", {
    payload: { directory },
  })

/** Grant the asset protocol read access to a folder the user just opened. */
export const allowImageDirectory = async (path: string) =>
  invokeWithLogging("allow_image_directory", { payload: { path } })

/** Write a UTF-8 text file (used for LabelMe JSON sidecars). */
export const writeTextFile = async (path: string, data: string) =>
  invokeWithLogging("fs_write_text_file", { payload: { path, data } })

/** Read a UTF-8 text file, or null if it does not exist. */
export const readTextFile = async (path: string) =>
  invokeWithLogging<string | null>("fs_read_text_file", { payload: { path } })

export const setSecret = async (
  namespace: string,
  key: string,
  value: string
) => invokeWithLogging("secret_set", { payload: { namespace, key, value } })

export const getSecret = async (namespace: string, key: string) =>
  invokeWithLogging<string | null>("secret_get", {
    payload: { namespace, key },
  })

export const deleteSecret = async (namespace: string, key: string) =>
  invokeWithLogging("secret_delete", { payload: { namespace, key } })

export const listSecrets = async (namespace: string) =>
  invokeWithLogging<string[]>("secret_list", { payload: { namespace } })

export const getUpdaterStatus = async () =>
  invokeWithLogging<UpdaterStatus>("updater_status")
