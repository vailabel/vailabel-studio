/**
 * Settings ViewModel
 * Manages settings state and operations using React Query
 * Follows MVVM pattern with React Query as the binding layer
 */

import { useState, useMemo, useEffect } from "react"
import { useMutation, useQueryClient } from "react-query"
import {
  useSettings,
  useSetting,
  useUpdateSettings,
} from "@/hooks/useFastAPIQuery"

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

  // Queries
  const { data: settingsArray = [], isLoading: settingsLoading } = useSettings()
  const { data: keyboardShortcutsSetting } = useSetting("keyboardShortcuts")

  // Mutations
  const updateSettingsMutation = useUpdateSettings()

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

  const updateKeyboardShortcuts = async (shortcuts: any[]) => {
    try {
      await updateSettingsMutation.mutateAsync({
        key: "keyboardShortcuts",
        value: JSON.stringify(shortcuts),
      })
      return true
    } catch (error) {
      console.error("Failed to update keyboard shortcuts:", error)
      throw error
    }
  }

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

    // Actions
    updateSetting,
    updateRulers,
    updateCrosshairs,
    updateCoordinates,
    updateBrightness,
    updateContrast,
    updateKeyboardShortcuts,

    // Mutation state
    updateSettingsMutation,
  }
}
