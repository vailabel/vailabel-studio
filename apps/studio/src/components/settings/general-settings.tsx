import { useState, useEffect, useRef } from "react"
import { Moon, Sun } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { useTheme } from "@/components/theme-provider"
import { ChromePicker } from "react-color"
import { Check } from "lucide-react"
import { ElectronFileInput } from "@/components/electron-file"
import { useServices } from "@/services/ServiceProvider"

const DEFAULTS = {
  brightness: 100,
  contrast: 100,
  annotationColor: "#3b82f6",
  boxThickness: 2,
  showLabels: true,
  snapToGrid: false,
  autoSave: true,
}

const PRESET_COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#10b981", // green
  "#f59e42", // orange
  "#a855f7", // purple
  "#fbbf24", // yellow
  "#6366f1", // indigo
  "#6b7280", // gray
]

export default function GeneralSettings() {
  const { theme, setTheme } = useTheme()
  const services = useServices()
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const allSettings = await services.getSettingsService().getSettings()
        const settingsMap: Record<string, string> = {}
        allSettings.forEach(setting => {
          settingsMap[setting.key] = setting.value
        })
        setSettings(settingsMap)
      } catch (error) {
        console.error("Failed to load settings:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadSettings()
  }, [])

  // Helper to get value from settings or fallback to default
  const getValue = (key: string, fallback: string | number | boolean) => {
    if (isLoading) return fallback
    const val = settings[key]
    if (val === undefined || val === null) return fallback
    if (typeof fallback === "boolean") {
      if (typeof val === "boolean") return val
      if (typeof val === "string") return val === "true"
      return Boolean(val)
    }
    if (typeof fallback === "number") return Number(val)
    return val
  }

  const brightness = getValue("brightness", DEFAULTS.brightness) as number
  const contrast = getValue("contrast", DEFAULTS.contrast) as number
  const annotationColor = getValue(
    "annotationColor",
    DEFAULTS.annotationColor
  ) as string
  const boxThickness = getValue("boxThickness", DEFAULTS.boxThickness) as number
  const showLabels = getValue("showLabels", DEFAULTS.showLabels) as boolean
  const snapToGrid = getValue("snapToGrid", DEFAULTS.snapToGrid) as boolean
  const autoSave = getValue("autoSave", DEFAULTS.autoSave) as boolean
  const dataDir = getValue("dataDirectory", "") as string

  const [showCustomColor, setShowCustomColor] = useState(false)
  const customBtnRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Close popover on outside click
  useEffect(() => {
    if (!showCustomColor) return
    function handleClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        customBtnRef.current &&
        !customBtnRef.current.contains(e.target as Node)
      ) {
        setShowCustomColor(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [showCustomColor])
  const handleReset = async () => {
    try {
      await Promise.all([
        services.getSettingsService().saveOrUpdateSetting("brightness", String(DEFAULTS.brightness)),
        services.getSettingsService().saveOrUpdateSetting("contrast", String(DEFAULTS.contrast)),
        services.getSettingsService().saveOrUpdateSetting("annotationColor", DEFAULTS.annotationColor),
        services.getSettingsService().saveOrUpdateSetting("boxThickness", String(DEFAULTS.boxThickness)),
        services.getSettingsService().saveOrUpdateSetting("showLabels", JSON.stringify(DEFAULTS.showLabels)),
        services.getSettingsService().saveOrUpdateSetting("snapToGrid", JSON.stringify(DEFAULTS.snapToGrid)),
        services.getSettingsService().saveOrUpdateSetting("autoSave", JSON.stringify(DEFAULTS.autoSave)),
      ])
      
      // Update local state
      setSettings(prev => ({
        ...prev,
        brightness: String(DEFAULTS.brightness),
        contrast: String(DEFAULTS.contrast),
        annotationColor: DEFAULTS.annotationColor,
        boxThickness: String(DEFAULTS.boxThickness),
        showLabels: JSON.stringify(DEFAULTS.showLabels),
        snapToGrid: JSON.stringify(DEFAULTS.snapToGrid),
        autoSave: JSON.stringify(DEFAULTS.autoSave),
      }))
    } catch (error) {
      console.error("Failed to reset settings:", error)
    }
  }

  // Helper function to save settings
  const saveSetting = async (key: string, value: string) => {
    try {
      await services.getSettingsService().saveOrUpdateSetting(key, value)
      setSettings(prev => ({ ...prev, [key]: value }))
    } catch (error) {
      console.error(`Failed to save setting ${key}:`, error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Data Directory */}
      <div>
        <label htmlFor="data-directory" className="text-base font-medium">
          Application Data Directory
        </label>
        <div className="flex flex-col sm:flex-row gap-2 mt-2 items-center">
          <ElectronFileInput
            onChange={(e) => {
              const dir = e.target.files[0]
              if (dir) {
                saveSetting("dataDirectory", dir)
              }
            }}
            accept=""
            multiple={false}
            className="flex-1"
            placeholder="Select a folder..."
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          This is the folder where application data (e.g., downloaded files)
          will be stored.
        </p>
        {dataDir && (
          <div className="mt-1 text-xs text-gray-700 dark:text-gray-200 break-all">
            Selected: {dataDir}
          </div>
        )}
      </div>
      {/* Dark Mode */}
      <div className="flex items-center justify-between">
        <div>
          <label htmlFor="dark-mode" className="text-base font-medium">
            Dark Mode
          </label>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Use dark theme for the application
          </p>
        </div>
        <Switch
          id="dark-mode"
          checked={theme === "dark"}
          onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        />
      </div>
      {/* Brightness */}
      <div>
        <label htmlFor="brightness" className="text-base font-medium">
          Brightness
        </label>
        <div className="flex items-center gap-2 mt-2">
          <Sun className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <Slider
            id="brightness"
            min={50}
            max={150}
            step={1}
            value={[brightness]}
            onValueChange={(value) =>
              saveSetting("brightness", String(value[0]))
            }
            className="flex-1"
          />
          <span className="w-8 text-right text-sm">{brightness}%</span>
        </div>
      </div>
      {/* Contrast */}
      <div>
        <label htmlFor="contrast" className="text-base font-medium">
          Contrast
        </label>
        <div className="flex items-center gap-2 mt-2">
          <Moon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <Slider
            id="contrast"
            min={50}
            max={150}
            step={1}
            value={[contrast]}
            onValueChange={(value) =>
              saveSetting("contrast", String(value[0]))
            }
            className="flex-1"
          />
          <span className="w-8 text-right text-sm">{contrast}%</span>
        </div>
      </div>
      {/* Annotation Color */}
      <div>
        <label htmlFor="annotation-color" className="text-base font-medium">
          Default Annotation Color
        </label>
        <div className="flex flex-wrap items-center gap-3 mt-2 relative">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={`relative h-8 w-8 rounded-full border-2 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-400 transition
                ${annotationColor === color && !showCustomColor ? "border-blue-600 ring-2 ring-blue-400" : "border-gray-300"}
                hover:border-blue-400`}
              style={{ backgroundColor: color }}
              aria-label={`Select ${color} as annotation color`}
              onClick={() => {
                saveSetting("annotationColor", color)
                setShowCustomColor(false)
              }}
            >
              {annotationColor === color && !showCustomColor && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Check className="h-4 w-4 text-white drop-shadow" />
                </span>
              )}
            </button>
          ))}
          <button
            ref={customBtnRef}
            type="button"
            className={`h-8 px-3 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-xs font-medium bg-white dark:bg-gray-900 border-gray-300 hover:border-blue-400 transition
              ${showCustomColor ? "border-blue-600 ring-2 ring-blue-400" : ""}`}
            onClick={() => setShowCustomColor((v) => !v)}
            aria-label="Custom color picker"
          >
            Custom...
          </button>
          <span
            className="ml-2 h-8 w-8 rounded-full border-2 border-gray-400 inline-block align-middle shadow"
            style={{ backgroundColor: annotationColor }}
            title="Current color"
          />
          {showCustomColor && (
            <div
              ref={popoverRef}
              className="absolute z-50 left-0 top-12 sm:left-auto sm:right-0 sm:top-12 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2"
            >
              <ChromePicker
                color={annotationColor}
                onChange={(color) =>
                  saveSetting("annotationColor", color.hex)
                }
                disableAlpha
              />
            </div>
          )}
        </div>
      </div>
      {/* Box Thickness */}
      <div>
        <label htmlFor="box-thickness" className="text-base font-medium">
          Box Thickness
        </label>
        <input
          id="box-thickness"
          type="number"
          min={1}
          max={10}
          value={boxThickness}
          onChange={(e) =>
            saveSetting("boxThickness", String(Number(e.target.value)))
          }
          className="ml-2 w-20 border rounded px-2 py-1"
        />
      </div>
      {/* Show Labels */}
      <div className="flex items-center gap-2">
        <Switch
          id="show-labels"
          checked={showLabels}
          onCheckedChange={(checked) =>
            saveSetting("showLabels", JSON.stringify(checked))
          }
        />
        <label htmlFor="show-labels" className="text-base font-medium">
          Show Labels on Annotations
        </label>
      </div>
      {/* Snap to Grid */}
      <div className="flex items-center gap-2">
        <Switch
          id="snap-to-grid"
          checked={snapToGrid}
          onCheckedChange={(checked) =>
            saveSetting("snapToGrid", JSON.stringify(checked))
          }
        />
        <label htmlFor="snap-to-grid" className="text-base font-medium">
          Snap to Grid
        </label>
      </div>
      {/* Auto Save */}
      <div className="flex items-center gap-2">
        <Switch
          id="auto-save"
          checked={autoSave}
          onCheckedChange={(checked) =>
            saveSetting("autoSave", JSON.stringify(checked))
          }
        />
        <label htmlFor="auto-save" className="text-base font-medium">
          Auto Save Annotations
        </label>
      </div>
      {/* Reset to Defaults */}
      <div>
        <button
          type="button"
          onClick={handleReset}
          className="mt-4 px-5 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  )
}
