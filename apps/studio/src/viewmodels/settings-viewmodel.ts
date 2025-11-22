/**
 * Settings ViewModel
 * Manages settings state and operations using React Query
 * Follows MVVM pattern with React Query as the binding layer
 */

import { useState, useMemo, useEffect } from "react"
import { useQueryClient } from "react-query"
import {
  useSettings,
  useSetting,
  useUpdateSettings,
} from "@/hooks/api/settings-hooks"

interface Settings {
  [key: string]: string | number | boolean
}

export const useSettingsViewModel = () => {
  const queryClient = useQueryClient()

  // State
  const [showRulers, setShowRulers] = useState(true)
  const [showCrosshairs, setShowCrosshairs] = useState(true)
  const [showCoordinates, setShowCoordinates] = useState(true)
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [activeTab, setActiveTab] = useState("general")
  const [searchQuery, setSearchQuery] = useState("")
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Queries
  const { data: settingsArray = [], isLoading: settingsLoading } = useSettings()
  const { data: keyboardShortcutsSetting } = useSetting("keyboardShortcuts")

  // Mutations
  const updateSettingsMutation = useUpdateSettings()

  // Categories
  const categories = [
    { id: "general", name: "General" },
    { id: "appearance", name: "Appearance" },
    { id: "python", name: "Python" },
    { id: "model", name: "Model" },
    { id: "shortcuts", name: "Shortcuts" },
    { id: "advanced", name: "Advanced" },
  ]

  // Computed values
  const settings = useMemo(() => {
    return settingsArray.reduce((acc, { key, value }) => {
      acc[key] = value
      return acc
    }, {} as Settings)
  }, [settingsArray])

  // Load settings when data is available
  useEffect(() => {
    if (settingsArray.length > 0) {
      setShowRulers(Boolean(settings.showRulers ?? true))
      setShowCrosshairs(Boolean(settings.showCrosshairs ?? true))
      setShowCoordinates(Boolean(settings.showCoordinates ?? true))
      setBrightness(Number(settings.brightness ?? 100))
      setContrast(Number(settings.contrast ?? 100))
    }
  }, [settingsArray, settings])

  // Actions
  const updateSetting = async (
    key: string,
    value: string | number | boolean
  ) => {
    try {
      await updateSettingsMutation.mutateAsync({
        key,
        value: String(value),
      })
      return true
    } catch (error) {
      console.error("Failed to update setting:", error)
      throw error
    }
  }

  const updateRulers = async (value: boolean) => {
    setShowRulers(value)
    return updateSetting("showRulers", value)
  }

  const updateCrosshairs = async (value: boolean) => {
    setShowCrosshairs(value)
    return updateSetting("showCrosshairs", value)
  }

  const updateCoordinates = async (value: boolean) => {
    setShowCoordinates(value)
    return updateSetting("showCoordinates", value)
  }

  const updateBrightness = async (value: number) => {
    setBrightness(value)
    return updateSetting("brightness", value)
  }

  const updateContrast = async (value: number) => {
    setContrast(value)
    return updateSetting("contrast", value)
  }

  const updateKeyboardShortcuts = async (
    shortcuts: Array<Record<string, unknown>>
  ) => {
    try {
      await updateSettingsMutation.mutateAsync({
        key: "keyboardShortcuts",
        value: JSON.stringify(shortcuts),
      })
      setHasUnsavedChanges(true)
      return true
    } catch (error) {
      console.error("Failed to update keyboard shortcuts:", error)
      throw error
    }
  }

  const saveSettings = async () => {
    try {
      setError(null)
      // Save all pending changes
      await queryClient.invalidateQueries(["settings"])
      setHasUnsavedChanges(false)
      setLastSaved(new Date())
      return true
    } catch (error: unknown) {
      setError((error as Error).message || "Failed to save settings")
      throw error
    }
  }

  const resetToDefaults = async () => {
    try {
      setError(null)
      // Reset to default values
      setShowRulers(true)
      setShowCrosshairs(true)
      setShowCoordinates(true)
      setBrightness(100)
      setContrast(100)
      setHasUnsavedChanges(true)
      return true
    } catch (error: unknown) {
      setError((error as Error).message || "Failed to reset settings")
      throw error
    }
  }

  const exportSettings = async () => {
    try {
      const settingsToExport = {
        showRulers,
        showCrosshairs,
        showCoordinates,
        brightness,
        contrast,
        keyboardShortcuts: keyboardShortcutsSetting?.value || "[]",
        ...settings,
      }
      const blob = new Blob([JSON.stringify(settingsToExport, null, 2)], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `vailabel-settings-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      return true
    } catch (error: unknown) {
      setError((error as Error).message || "Failed to export settings")
      throw error
    }
  }

  const importSettings = async (file: File) => {
    try {
      setError(null)
      const text = await file.text()
      const importedSettings = JSON.parse(text)

      // Apply imported settings
      if (importedSettings.showRulers !== undefined) {
        setShowRulers(importedSettings.showRulers)
        await updateSetting("showRulers", importedSettings.showRulers)
      }
      if (importedSettings.showCrosshairs !== undefined) {
        setShowCrosshairs(importedSettings.showCrosshairs)
        await updateSetting("showCrosshairs", importedSettings.showCrosshairs)
      }
      if (importedSettings.showCoordinates !== undefined) {
        setShowCoordinates(importedSettings.showCoordinates)
        await updateSetting("showCoordinates", importedSettings.showCoordinates)
      }
      if (importedSettings.brightness !== undefined) {
        setBrightness(importedSettings.brightness)
        await updateSetting("brightness", importedSettings.brightness)
      }
      if (importedSettings.contrast !== undefined) {
        setContrast(importedSettings.contrast)
        await updateSetting("contrast", importedSettings.contrast)
      }
      if (importedSettings.keyboardShortcuts !== undefined) {
        await updateSettingsMutation.mutateAsync({
          key: "keyboardShortcuts",
          value: importedSettings.keyboardShortcuts,
        })
      }

      // Import other settings
      for (const [key, value] of Object.entries(importedSettings)) {
        if (
          ![
            "showRulers",
            "showCrosshairs",
            "showCoordinates",
            "brightness",
            "contrast",
            "keyboardShortcuts",
          ].includes(key)
        ) {
          await updateSetting(key, value as string | number | boolean)
        }
      }

      setHasUnsavedChanges(false)
      setLastSaved(new Date())
      await queryClient.invalidateQueries(["settings"])
      return true
    } catch (error: unknown) {
      setError((error as Error).message || "Failed to import settings")
      throw error
    }
  }

  // Update hasUnsavedChanges when settings change
  useEffect(() => {
    // This will be set by individual update functions
  }, [showRulers, showCrosshairs, showCoordinates, brightness, contrast])

  return {
    // State
    settings,
    showRulers,
    showCrosshairs,
    showCoordinates,
    brightness,
    contrast,
    keyboardShortcuts: keyboardShortcutsSetting?.value || "[]",
    isLoading: settingsLoading,
    categories,
    activeTab,
    searchQuery,
    isSaving: updateSettingsMutation.isLoading,
    hasUnsavedChanges,
    lastSaved,
    error,

    // Actions
    updateSetting,
    updateRulers,
    updateCrosshairs,
    updateCoordinates,
    updateBrightness,
    updateContrast,
    updateKeyboardShortcuts,
    setActiveTab,
    setSearchQuery,
    saveSettings,
    resetToDefaults,
    exportSettings,
    importSettings,

    // Mutation state
    updateSettingsMutation,
  }
}
