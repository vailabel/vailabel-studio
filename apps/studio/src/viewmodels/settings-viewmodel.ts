import { useCallback, useEffect, useMemo, useState } from "react"
import { Settings } from "@/types/core"
import { listenToStudioEvents } from "@/ipc/events"
import { services } from "@/services"

type SettingValue = string | number | boolean

export interface KeyboardShortcut {
  category: string
  action: string
  key: string
}

export const DEFAULT_KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { category: "File", action: "Open File", key: "Ctrl+O" },
  { category: "File", action: "Save File", key: "Ctrl+S" },
  { category: "Edit", action: "Undo", key: "Ctrl+Z" },
  { category: "Edit", action: "Redo", key: "Ctrl+Y" },
  { category: "Edit", action: "Delete Selection", key: "Del" },
  { category: "Annotation", action: "Add Bounding Box", key: "B" },
  { category: "Annotation", action: "Add Polygon", key: "P" },
  { category: "Annotation", action: "Add Point", key: "O" },
  { category: "Navigation", action: "Zoom In", key: "+" },
  { category: "Navigation", action: "Zoom Out", key: "-" },
  { category: "Navigation", action: "Pan", key: "Space" },
]

const DEFAULT_SETTINGS: Record<string, SettingValue> = {
  showRulers: true,
  showCrosshairs: true,
  showCoordinates: true,
  brightness: 100,
  contrast: 100,
  keyboardShortcuts: JSON.stringify(DEFAULT_KEYBOARD_SHORTCUTS),
}

export const useSettingsViewModel = () => {
  const [settingsArray, setSettingsArray] = useState<Settings[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("general")
  const [searchQuery, setSearchQuery] = useState("")
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadSettings = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      setSettingsArray(await services.getSettingsService().list())
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  useEffect(() => {
    let unlisten: (() => void) | undefined

    void listenToStudioEvents(() => {
      void loadSettings()
    }, ["settings"]).then((cleanup) => {
      unlisten = cleanup
    })

    return () => {
      unlisten?.()
    }
  }, [loadSettings])

  const settings = useMemo(() => {
    const base = { ...DEFAULT_SETTINGS } as Record<string, SettingValue>
    for (const setting of settingsArray) {
      base[setting.key] = parseSettingValue(setting.value)
    }
    return base
  }, [settingsArray])

  const keyboardShortcutsList = useMemo(
    () => parseKeyboardShortcuts(String(settings.keyboardShortcuts ?? "[]")),
    [settings.keyboardShortcuts]
  )

  const updateSetting = async (key: string, value: SettingValue) => {
    setIsSaving(true)
    setError(null)
    try {
      const savedSetting = await services
        .getSettingsService()
        .update(key, serializeSettingValue(value))
      setSettingsArray((current) => upsertSetting(current, savedSetting))
      setHasUnsavedChanges(true)
      return true
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError))
      throw nextError
    } finally {
      setIsSaving(false)
    }
  }

  return {
    settings,
    settingsArray,
    showRulers: Boolean(settings.showRulers),
    showCrosshairs: Boolean(settings.showCrosshairs),
    showCoordinates: Boolean(settings.showCoordinates),
    brightness: Number(settings.brightness ?? 100),
    contrast: Number(settings.contrast ?? 100),
    keyboardShortcuts: String(settings.keyboardShortcuts ?? "[]"),
    keyboardShortcutsList,
    isLoading,
    isSaving,
    categories: [
      { id: "general", name: "General" },
      { id: "appearance", name: "Appearance" },
      { id: "model", name: "Model" },
      { id: "shortcuts", name: "Shortcuts" },
      { id: "advanced", name: "Advanced" },
    ],
    activeTab,
    searchQuery,
    hasUnsavedChanges,
    lastSaved,
    error,
    getSettingValue: (key: string) => settings[key],
    updateSetting,
    updateRulers: (value: boolean) => updateSetting("showRulers", value),
    updateCrosshairs: (value: boolean) =>
      updateSetting("showCrosshairs", value),
    updateCoordinates: (value: boolean) =>
      updateSetting("showCoordinates", value),
    updateBrightness: (value: number) => updateSetting("brightness", value),
    updateContrast: (value: number) => updateSetting("contrast", value),
    updateKeyboardShortcuts: (shortcuts: KeyboardShortcut[]) =>
      updateSetting("keyboardShortcuts", JSON.stringify(shortcuts)),
    setActiveTab,
    setSearchQuery,
    saveSettings: async () => {
      setHasUnsavedChanges(false)
      setLastSaved(new Date())
      return true
    },
    resetToDefaults: async () => {
      for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        await updateSetting(key, value)
      }
      setHasUnsavedChanges(false)
      setLastSaved(new Date())
      return true
    },
    exportSettings: async () => {
      const blob = new Blob([JSON.stringify(settings, null, 2)], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `vailabel-settings-${new Date().toISOString().split("T")[0]}.json`
      link.click()
      URL.revokeObjectURL(url)
      return true
    },
    importSettings: async (file: File) => {
      const importedSettings = JSON.parse(
        await file.text()
      ) as Record<string, SettingValue>
      for (const [key, value] of Object.entries(importedSettings)) {
        await updateSetting(key, value)
      }
      setHasUnsavedChanges(false)
      setLastSaved(new Date())
      return true
    },
    refreshSettings: loadSettings,
  }
}

function parseSettingValue(value: string): SettingValue {
  if (value === "true") return true
  if (value === "false") return false
  const numericValue = Number(value)
  if (!Number.isNaN(numericValue) && value.trim() !== "") return numericValue
  return value
}

function serializeSettingValue(value: SettingValue) {
  return typeof value === "string" ? value : String(value)
}

function upsertSetting(current: Settings[], next: Settings) {
  const existing = current.find((setting) => setting.key === next.key)
  if (!existing) return [...current, next]
  return current.map((setting) => (setting.key === next.key ? next : setting))
}

function parseKeyboardShortcuts(value: string): KeyboardShortcut[] {
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as KeyboardShortcut[]
    }
  } catch {}

  return [...DEFAULT_KEYBOARD_SHORTCUTS]
}

