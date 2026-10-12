import { useMemo, useState } from "react"
import { Settings } from "@/shared/types/core"
import { useResource } from "@/shared/hooks/use-resource"
import { services } from "@/shared/services"
import { toErrorMessage } from "@/shared/lib/errors"

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
  { category: "Annotation", action: "Move Tool", key: "M" },
  { category: "Annotation", action: "Add Bounding Box", key: "B" },
  { category: "Annotation", action: "Add Polygon", key: "P" },
  { category: "Annotation", action: "Free Draw", key: "F" },
  { category: "Annotation", action: "Delete Tool", key: "D" },
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

const NO_SETTINGS: Settings[] = []
const loadSettingsList = () => services.getSettingsService().list()

export const useSettingsViewModel = () => {
  const {
    data: settingsArray,
    isLoading,
    error: loadError,
    reload: loadSettings,
    mutate: mutateSettings,
  } = useResource(loadSettingsList, {
    initialData: NO_SETTINGS,
    invalidateOn: ["settings"],
  })
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("general")
  const [searchQuery, setSearchQuery] = useState("")
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const error = saveError ?? (loadError ? toErrorMessage(loadError) : null)

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
    setSaveError(null)
    try {
      const savedSetting = await services
        .getSettingsService()
        .update(key, serializeSettingValue(value))
      mutateSettings((current) => upsertSetting(current, savedSetting))
      setHasUnsavedChanges(true)
      return true
    } catch (nextError) {
      setSaveError(toErrorMessage(nextError))
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
      { id: "copilot", name: "AI Copilot" },
      { id: "runtime", name: "AI Runtime" },
      { id: "shortcuts", name: "Shortcuts" },
      { id: "cloud", name: "Cloud Storage" },
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
  } catch (error) {
    console.warn("Failed to parse keyboard shortcuts, using defaults", error)
  }

  return [...DEFAULT_KEYBOARD_SHORTCUTS]
}

