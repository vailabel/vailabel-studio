import { useState, useCallback, useEffect, useMemo } from "react"
import { useServices } from "@/services/ServiceProvider"
import { useToast } from "@/hooks/use-toast"

export interface SettingCategory {
  id: string
  name: string
  description: string
  icon: string
  order: number
}

export interface SettingItem {
  id: string
  key: string
  category: string
  name: string
  description: string
  type: "boolean" | "number" | "string" | "color" | "file" | "select"
  value: string | number | boolean
  defaultValue: string | number | boolean
  options?: Array<{ label: string; value: string }>
  min?: number
  max?: number
  step?: number
  validation?: (value: unknown) => string | null
}

export interface SettingsState {
  // Data
  settings: Record<string, SettingItem>
  categories: SettingCategory[]
  
  // UI State
  isLoading: boolean
  isSaving: boolean
  error: string | null
  
  // Navigation
  activeTab: string
  searchQuery: string
  
  // Validation
  validationErrors: Record<string, string>
  
  // Computed
  filteredSettings: Record<string, SettingItem>
  hasUnsavedChanges: boolean
  lastSaved: Date | null
}

export interface SettingsActions {
  // Data Operations
  loadSettings: () => Promise<void>
  saveSettings: () => Promise<void>
  resetToDefaults: () => Promise<void>
  exportSettings: () => Promise<void>
  importSettings: (file: File) => Promise<void>
  
  // Setting Operations
  updateSetting: (key: string, value: unknown) => void
  validateSetting: (key: string, value: unknown) => boolean
  
  // Navigation
  setActiveTab: (tab: string) => void
  setSearchQuery: (query: string) => void
  
  // Computed Values
  getSettingValue: (key: string) => unknown
  getCategorySettings: (category: string) => SettingItem[]
  hasChanges: boolean
}

const DEFAULT_CATEGORIES: SettingCategory[] = [
  {
    id: "general",
    name: "General",
    description: "Basic application settings",
    icon: "Settings",
    order: 1,
  },
  {
    id: "appearance",
    name: "Appearance",
    description: "Theme and display settings",
    icon: "Palette",
    order: 2,
  },
  {
    id: "python",
    name: "Python Setup",
    description: "Python environment configuration",
    icon: "Code",
    order: 3,
  },
  {
    id: "model",
    name: "Model Selection",
    description: "AI model configuration",
    icon: "Brain",
    order: 4,
  },
  {
    id: "shortcuts",
    name: "Keyboard Shortcuts",
    description: "Customize keyboard shortcuts",
    icon: "Keyboard",
    order: 5,
  },
  {
    id: "advanced",
    name: "Advanced",
    description: "Advanced configuration options",
    icon: "Cog",
    order: 6,
  },
]

const DEFAULT_SETTINGS: SettingItem[] = [
  // General Settings
  {
    id: "dataDirectory",
    key: "dataDirectory",
    category: "general",
    name: "Data Directory",
    description: "Folder where application data is stored",
    type: "file",
    value: "",
    defaultValue: "",
  },
  {
    id: "autoSave",
    key: "autoSave",
    category: "general",
    name: "Auto Save",
    description: "Automatically save annotations",
    type: "boolean",
    value: true,
    defaultValue: true,
  },
  {
    id: "showLabels",
    key: "showLabels",
    category: "general",
    name: "Show Labels",
    description: "Display labels on annotations",
    type: "boolean",
    value: true,
    defaultValue: true,
  },
  {
    id: "snapToGrid",
    key: "snapToGrid",
    category: "general",
    name: "Snap to Grid",
    description: "Snap annotations to grid",
    type: "boolean",
    value: false,
    defaultValue: false,
  },
  
  // Appearance Settings
  {
    id: "theme",
    key: "theme",
    category: "appearance",
    name: "Theme",
    description: "Application theme",
    type: "select",
    value: "light",
    defaultValue: "light",
    options: [
      { label: "Light", value: "light" },
      { label: "Dark", value: "dark" },
      { label: "System", value: "system" },
    ],
  },
  {
    id: "brightness",
    key: "brightness",
    category: "appearance",
    name: "Brightness",
    description: "Image brightness adjustment",
    type: "number",
    value: 100,
    defaultValue: 100,
    min: 50,
    max: 150,
    step: 1,
  },
  {
    id: "contrast",
    key: "contrast",
    category: "appearance",
    name: "Contrast",
    description: "Image contrast adjustment",
    type: "number",
    value: 100,
    defaultValue: 100,
    min: 50,
    max: 150,
    step: 1,
  },
  {
    id: "annotationColor",
    key: "annotationColor",
    category: "appearance",
    name: "Annotation Color",
    description: "Default color for annotations",
    type: "color",
    value: "#3b82f6",
    defaultValue: "#3b82f6",
  },
  {
    id: "boxThickness",
    key: "boxThickness",
    category: "appearance",
    name: "Box Thickness",
    description: "Thickness of bounding box lines",
    type: "number",
    value: 2,
    defaultValue: 2,
    min: 1,
    max: 10,
    step: 1,
  },
  
  // Additional Appearance Settings
  {
    id: "accentColor",
    key: "accentColor",
    category: "appearance",
    name: "Accent Color",
    description: "Primary accent color for UI elements",
    type: "color",
    value: "#3b82f6",
    defaultValue: "#3b82f6",
  },
  {
    id: "fontSize",
    key: "fontSize",
    category: "appearance",
    name: "Font Size",
    description: "Base font size for the application",
    type: "number",
    value: 14,
    defaultValue: 14,
    min: 12,
    max: 20,
    step: 1,
  },
  {
    id: "fontFamily",
    key: "fontFamily",
    category: "appearance",
    name: "Font Family",
    description: "Font family for the application",
    type: "select",
    value: "system-ui",
    defaultValue: "system-ui",
    options: [
      { label: "System Default", value: "system-ui" },
      { label: "Inter", value: "Inter" },
      { label: "Roboto", value: "Roboto" },
      { label: "Open Sans", value: "Open Sans" },
      { label: "Source Sans Pro", value: "Source Sans Pro" },
      { label: "Monaco", value: "Monaco" },
    ],
  },
  {
    id: "uiDensity",
    key: "uiDensity",
    category: "appearance",
    name: "UI Density",
    description: "Spacing and layout density",
    type: "select",
    value: "comfortable",
    defaultValue: "comfortable",
    options: [
      { label: "Compact", value: "compact" },
      { label: "Comfortable", value: "comfortable" },
      { label: "Spacious", value: "spacious" },
    ],
  },
  {
    id: "animationsEnabled",
    key: "animationsEnabled",
    category: "appearance",
    name: "Enable Animations",
    description: "Enable smooth transitions and animations",
    type: "boolean",
    value: true,
    defaultValue: true,
  },
  {
    id: "reducedMotion",
    key: "reducedMotion",
    category: "appearance",
    name: "Reduced Motion",
    description: "Minimize animations for accessibility",
    type: "boolean",
    value: false,
    defaultValue: false,
  },
  {
    id: "highContrast",
    key: "highContrast",
    category: "appearance",
    name: "High Contrast Mode",
    description: "Increase contrast for better visibility",
    type: "boolean",
    value: false,
    defaultValue: false,
  },
  
  // Model Settings
  {
    id: "selectedModelId",
    key: "selectedModelId",
    category: "model",
    name: "Selected Model",
    description: "Currently selected AI model",
    type: "string",
    value: "",
    defaultValue: "",
  },
  {
    id: "modelPath",
    key: "modelPath",
    category: "model",
    name: "Model Path",
    description: "Path to the AI model file",
    type: "string",
    value: "",
    defaultValue: "",
  },
  
  // Shortcuts Settings
  {
    id: "keyboardShortcuts",
    key: "keyboardShortcuts",
    category: "shortcuts",
    name: "Keyboard Shortcuts",
    description: "Custom keyboard shortcuts configuration",
    type: "string",
    value: "[]",
    defaultValue: "[]",
  },
]

export function useSettingsViewModel(): SettingsState & SettingsActions {
  const services = useServices()
  const { toast } = useToast()

  // State
  const [state, setState] = useState<SettingsState>({
    settings: {},
    categories: DEFAULT_CATEGORIES,
    isLoading: false,
    isSaving: false,
    error: null,
    activeTab: "general",
    searchQuery: "",
    validationErrors: {},
    filteredSettings: {},
    hasUnsavedChanges: false,
    lastSaved: null,
  })

  // Initialize settings from defaults
  useEffect(() => {
    const settingsMap: Record<string, SettingItem> = {}
    DEFAULT_SETTINGS.forEach(setting => {
      settingsMap[setting.key] = { ...setting }
    })
    setState(prev => ({ ...prev, settings: settingsMap }))
  }, [])

  // Data Operations
  const loadSettings = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const savedSettings = await services.getSettingsService().getSettings()
      const settingsMap: Record<string, SettingItem> = {}
      
      // Initialize with defaults
      DEFAULT_SETTINGS.forEach(setting => {
        settingsMap[setting.key] = { ...setting }
      })
      
      // Override with saved values
      savedSettings.forEach(savedSetting => {
        if (settingsMap[savedSetting.key]) {
          const setting = settingsMap[savedSetting.key]
          let value: unknown = savedSetting.value
          
          // Parse value based on type
          if (setting.type === "boolean") {
            value = value === "true" || value === true
          } else if (setting.type === "number") {
            value = Number(value)
          }
          
          settingsMap[savedSetting.key] = {
            ...setting,
            value: value as string | number | boolean,
          }
        }
      })
      
      setState(prev => ({ 
        ...prev, 
        settings: settingsMap,
        lastSaved: new Date(),
      }))
    } catch (error) {
      const errorMessage = "Failed to load settings"
      setState(prev => ({ ...prev, error: errorMessage }))
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      console.error("Failed to load settings:", error)
    } finally {
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [services, toast])

  const saveSettings = useCallback(async () => {
    setState(prev => ({ ...prev, isSaving: true, error: null }))
    
    try {
      const savePromises = Object.values(state.settings).map(setting => {
        let value = setting.value
        if (typeof value === "boolean") {
          value = String(value)
        } else if (typeof value === "object") {
          value = JSON.stringify(value)
        }
        return services.getSettingsService().saveOrUpdateSetting(setting.key, String(value))
      })
      
      await Promise.all(savePromises)
      
      setState(prev => ({ 
        ...prev, 
        hasUnsavedChanges: false,
        lastSaved: new Date(),
      }))
      
      toast({
        title: "Success",
        description: "Settings saved successfully",
      })
    } catch (error) {
      const errorMessage = "Failed to save settings"
      setState(prev => ({ ...prev, error: errorMessage }))
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      console.error("Failed to save settings:", error)
    } finally {
      setState(prev => ({ ...prev, isSaving: false }))
    }
  }, [state.settings, services, toast])

  const resetToDefaults = useCallback(async () => {
    try {
      const resetPromises = DEFAULT_SETTINGS.map(setting => {
        let value = setting.defaultValue
        if (typeof value === "boolean") {
          value = String(value)
        } else if (typeof value === "object") {
          value = JSON.stringify(value)
        }
        return services.getSettingsService().saveOrUpdateSetting(setting.key, String(value))
      })
      
      await Promise.all(resetPromises)
      
      // Update local state
      const settingsMap: Record<string, SettingItem> = {}
      DEFAULT_SETTINGS.forEach(setting => {
        settingsMap[setting.key] = { ...setting }
      })
      
      setState(prev => ({ 
        ...prev, 
        settings: settingsMap,
        hasUnsavedChanges: false,
        validationErrors: {},
      }))
      
      toast({
        title: "Success",
        description: "Settings reset to defaults",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset settings",
        variant: "destructive",
      })
      console.error("Failed to reset settings:", error)
    }
  }, [services, toast])

  const exportSettings = useCallback(async () => {
    try {
      const settingsToExport = Object.values(state.settings).reduce((acc, setting) => {
        acc[setting.key] = setting.value
        return acc
      }, {} as Record<string, unknown>)
      
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
      
      toast({
        title: "Success",
        description: "Settings exported successfully",
      })
    } catch {
      toast({
        title: "Error",
        description: "Failed to export settings",
        variant: "destructive",
      })
    }
  }, [state.settings, toast])

  const importSettings = useCallback(async (file: File) => {
    try {
      const text = await file.text()
      const importedSettings = JSON.parse(text) as Record<string, unknown>
      
      // Validate imported settings
      const validSettings: Record<string, SettingItem> = {}
      Object.entries(importedSettings).forEach(([key, value]) => {
        const defaultSetting = DEFAULT_SETTINGS.find(s => s.key === key)
        if (defaultSetting) {
          validSettings[key] = {
            ...defaultSetting,
            value: value as string | number | boolean,
          }
        }
      })
      
      // Save imported settings
      const savePromises = Object.values(validSettings).map(setting => {
        let value: unknown = setting.value
        if (typeof value === "boolean") {
          value = String(value)
        } else if (typeof value === "object") {
          value = JSON.stringify(value)
        }
        return services.getSettingsService().saveOrUpdateSetting(setting.key, String(value))
      })
      
      await Promise.all(savePromises)
      
      setState(prev => ({ 
        ...prev, 
        settings: { ...prev.settings, ...validSettings },
        hasUnsavedChanges: false,
      }))
      
      toast({
        title: "Success",
        description: "Settings imported successfully",
      })
    } catch {
      toast({
        title: "Error",
        description: "Failed to import settings",
        variant: "destructive",
      })
    }
  }, [services, toast])

  // Setting Operations
  const updateSetting = useCallback((key: string, value: unknown) => {
    setState(prev => {
      const updatedSettings = { ...prev.settings }
      if (updatedSettings[key]) {
        updatedSettings[key] = {
          ...updatedSettings[key],
          value: value as string | number | boolean,
        }
      }
      
      return {
        ...prev,
        settings: updatedSettings,
        hasUnsavedChanges: true,
        validationErrors: {
          ...prev.validationErrors,
          [key]: "",
        },
      }
    })
  }, [])

  const validateSetting = useCallback((key: string, value: unknown): boolean => {
    const setting = state.settings[key]
    if (!setting || !setting.validation) return true
    
    const error = setting.validation(value)
    setState(prev => ({
      ...prev,
      validationErrors: {
        ...prev.validationErrors,
        [key]: error || "",
      },
    }))
    
    return !error
  }, [state.settings])

  // Navigation
  const setActiveTab = useCallback((tab: string) => {
    setState(prev => ({ ...prev, activeTab: tab }))
  }, [])

  const setSearchQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }))
  }, [])

  // Computed Values
  const getSettingValue = useCallback((key: string) => {
    return state.settings[key]?.value
  }, [state.settings])

  const getCategorySettings = useCallback((category: string) => {
    return Object.values(state.settings).filter(setting => setting.category === category)
  }, [state.settings])

  const hasChanges = state.hasUnsavedChanges

  // Filtered settings based on search query
  const filteredSettings = useMemo(() => {
    if (!state.searchQuery) return state.settings
    
    const query = state.searchQuery.toLowerCase()
    const filtered: Record<string, SettingItem> = {}
    
    Object.values(state.settings).forEach(setting => {
      if (
        setting.name.toLowerCase().includes(query) ||
        setting.description.toLowerCase().includes(query) ||
        setting.key.toLowerCase().includes(query)
      ) {
        filtered[setting.key] = setting
      }
    })
    
    return filtered
  }, [state.settings, state.searchQuery])

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  return {
    ...state,
    filteredSettings,
    loadSettings,
    saveSettings,
    resetToDefaults,
    exportSettings,
    importSettings,
    updateSetting,
    validateSetting,
    setActiveTab,
    setSearchQuery,
    getSettingValue,
    getCategorySettings,
    hasChanges,
  }
}
