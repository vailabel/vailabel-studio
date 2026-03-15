import { invoke } from "@tauri-apps/api/core"

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

export const getSystemInfo = async () => invoke<SystemInfo>("system_info")

export const openPathDialog = async (request: OpenDialogRequest) =>
  invoke<string[]>("open_path_dialog", { request })

export const openExternalUrl = async (url: string) =>
  invoke("open_external", { payload: { url } })

export const ensureDirectory = async (path: string) =>
  invoke("fs_ensure_directory", { payload: { path } })

export const saveImageFile = async (path: string, data: string) =>
  invoke("fs_save_image", { payload: { path, data } })

export const loadImageFile = async (path: string) =>
  invoke<string>("fs_load_image", { payload: { path } })

export const deleteImageFile = async (path: string) =>
  invoke("fs_delete_image", { payload: { path } })

export const listImageFiles = async (directory: string) =>
  invoke<string[]>("fs_list_images", { payload: { directory } })

export const getBaseName = async (file: string) =>
  invoke<string>("fs_get_base_name", { payload: { file } })

export const setSecret = async (
  namespace: string,
  key: string,
  value: string
) => invoke("secret_set", { payload: { namespace, key, value } })

export const getSecret = async (namespace: string, key: string) =>
  invoke<string | null>("secret_get", { payload: { namespace, key } })

export const deleteSecret = async (namespace: string, key: string) =>
  invoke("secret_delete", { payload: { namespace, key } })

export const listSecrets = async (namespace: string) =>
  invoke<string[]>("secret_list", { payload: { namespace } })

export const getUpdaterStatus = async () =>
  invoke<UpdaterStatus>("updater_status")
