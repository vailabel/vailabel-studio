import { useEffect, useRef, useState } from "react"
import {
  Moon,
  Sun,
  Palette,
  Eye,
  EyeOff,
  Type,
  Layout,
  Zap,
  RotateCcw,
  Check,
  Monitor,
} from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChromePicker } from "react-color"
import { cn } from "@/lib/utils"
import { useTheme } from "@/components/layout/theme-provider"
import { useSettings } from "@/contexts/settings-context"
import {
  SettingsSection,
  SettingRow,
  SettingSlider,
} from "@/components/settings/settings-ui"

const PRESET_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e42",
  "#a855f7",
  "#fbbf24",
  "#6366f1",
  "#6b7280",
]

const ACCENT_COLORS = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#10b981" },
  { name: "Purple", value: "#a855f7" },
  { name: "Orange", value: "#f59e42" },
  { name: "Red", value: "#ef4444" },
  { name: "Pink", value: "#ec4899" },
]

const FONT_FAMILIES = [
  { name: "System Default", value: "system-ui" },
  { name: "Inter", value: "Inter" },
  { name: "Roboto", value: "Roboto" },
  { name: "Open Sans", value: "Open Sans" },
  { name: "Source Sans Pro", value: "Source Sans Pro" },
  { name: "Monaco", value: "Monaco" },
]

const UI_DENSITY_OPTIONS = [
  { name: "Compact", value: "compact", description: "Tighter spacing" },
  { name: "Comfortable", value: "comfortable", description: "Recommended" },
  { name: "Spacious", value: "spacious", description: "More breathing room" },
]

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const

export default function AppearanceSettings() {
  const { theme, setTheme } = useTheme()
  const { getSettingValue, updateSetting } = useSettings()

  const [showCustomColor, setShowCustomColor] = useState(false)
  const customBtnRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const brightness = (getSettingValue("brightness") as number) || 100
  const contrast = (getSettingValue("contrast") as number) || 100
  const annotationColor =
    (getSettingValue("annotationColor") as string) || "#3b82f6"
  const boxThickness = (getSettingValue("boxThickness") as number) || 2
  const accentColor = (getSettingValue("accentColor") as string) || "#3b82f6"
  const fontSize = (getSettingValue("fontSize") as number) || 14
  const fontFamily = (getSettingValue("fontFamily") as string) || "system-ui"
  const uiDensity = (getSettingValue("uiDensity") as string) || "comfortable"
  const animationsEnabled =
    (getSettingValue("animationsEnabled") as boolean) ?? true
  const reducedMotion = (getSettingValue("reducedMotion") as boolean) ?? false
  const highContrast = (getSettingValue("highContrast") as boolean) ?? false

  // Close the custom-color popover on outside click.
  useEffect(() => {
    if (!showCustomColor) return
    const handleClick = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        customBtnRef.current &&
        !customBtnRef.current.contains(event.target as Node)
      ) {
        setShowCustomColor(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [showCustomColor])

  const handleThemeChange = (next: string) => {
    setTheme(next as "light" | "dark" | "system")
    updateSetting("theme", next)
  }

  const handleColorChange = (color: string) => {
    updateSetting("annotationColor", color)
    setShowCustomColor(false)
  }

  const handleResetAppearance = () => {
    updateSetting("brightness", 100)
    updateSetting("contrast", 100)
    updateSetting("annotationColor", "#3b82f6")
    updateSetting("boxThickness", 2)
    updateSetting("accentColor", "#3b82f6")
    updateSetting("fontSize", 14)
    updateSetting("fontFamily", "system-ui")
    updateSetting("uiDensity", "comfortable")
    updateSetting("animationsEnabled", true)
    updateSetting("reducedMotion", false)
    updateSetting("highContrast", false)
  }

  return (
    <div className="space-y-6">
      <SettingsSection
        icon={Palette}
        title="Theme"
        description="Choose your preferred application theme"
      >
        <div className="grid grid-cols-3 gap-3">
          {THEMES.map((item) => (
            <Button
              key={item.value}
              variant={theme === item.value ? "default" : "outline"}
              className="h-20 flex-col gap-2"
              onClick={() => handleThemeChange(item.value)}
            >
              <item.icon className="h-6 w-6" />
              <span>{item.label}</span>
            </Button>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        icon={Eye}
        title="Image Adjustments"
        description="Adjust brightness and contrast for better visibility"
      >
        <div className="space-y-6">
          <SettingSlider
            title="Brightness"
            value={brightness}
            unit="%"
            leading={<Sun className="h-4 w-4 text-muted-foreground" />}
            trailing={<Moon className="h-4 w-4 text-muted-foreground" />}
          >
            <Slider
              min={50}
              max={150}
              step={1}
              value={[brightness]}
              onValueChange={(value) => updateSetting("brightness", value[0])}
            />
          </SettingSlider>
          <SettingSlider
            title="Contrast"
            value={contrast}
            unit="%"
            leading={<EyeOff className="h-4 w-4 text-muted-foreground" />}
            trailing={<Eye className="h-4 w-4 text-muted-foreground" />}
          >
            <Slider
              min={50}
              max={150}
              step={1}
              value={[contrast]}
              onValueChange={(value) => updateSetting("contrast", value[0])}
            />
          </SettingSlider>
        </div>
      </SettingsSection>

      <SettingsSection
        icon={Palette}
        title="Annotation Style"
        description="Default color and stroke width for new annotations"
      >
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-medium">Default color</p>
            <div className="relative flex flex-wrap items-center gap-3">
              {PRESET_COLORS.map((color) => {
                const active = annotationColor === color && !showCustomColor
                return (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      "relative h-9 w-9 rounded-full border-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active
                        ? "border-primary ring-2 ring-ring"
                        : "border-border hover:border-primary"
                    )}
                    style={{ backgroundColor: color }}
                    aria-label={`Select ${color}`}
                    onClick={() => handleColorChange(color)}
                  >
                    {active && (
                      <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" />
                    )}
                  </button>
                )
              })}
              <button
                ref={customBtnRef}
                type="button"
                className={cn(
                  "h-9 rounded-full border-2 px-4 text-sm font-medium",
                  showCustomColor
                    ? "border-primary ring-2 ring-ring"
                    : "border-border hover:border-primary"
                )}
                onClick={() => setShowCustomColor((value) => !value)}
              >
                Custom…
              </button>
              <span
                className="h-8 w-8 rounded-full border-2 border-border"
                style={{ backgroundColor: annotationColor }}
                title={annotationColor}
              />
              {showCustomColor && (
                <div
                  ref={popoverRef}
                  className="absolute left-0 top-12 z-50 rounded-lg border border-border bg-background p-3 shadow-lg"
                >
                  <ChromePicker
                    color={annotationColor}
                    onChange={(color) => handleColorChange(color.hex)}
                    disableAlpha
                  />
                </div>
              )}
            </div>
          </div>

          <SettingSlider
            title="Box thickness"
            value={boxThickness}
            unit="px"
            leading={<span className="text-xs text-muted-foreground">1</span>}
            trailing={<span className="text-xs text-muted-foreground">10</span>}
          >
            <Slider
              min={1}
              max={10}
              step={1}
              value={[boxThickness]}
              onValueChange={(value) => updateSetting("boxThickness", value[0])}
            />
          </SettingSlider>
        </div>
      </SettingsSection>

      <SettingsSection
        icon={Type}
        title="Typography"
        description="Customize text appearance and readability"
      >
        <div className="space-y-6">
          <SettingSlider
            title="Font size"
            value={fontSize}
            unit="px"
            leading={<span className="text-xs text-muted-foreground">12</span>}
            trailing={<span className="text-xs text-muted-foreground">20</span>}
          >
            <Slider
              min={12}
              max={20}
              step={1}
              value={[fontSize]}
              onValueChange={(value) => updateSetting("fontSize", value[0])}
            />
          </SettingSlider>

          <SettingRow title="Font family">
            <Select
              value={fontFamily}
              onValueChange={(value) => updateSetting("fontFamily", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select font family" />
              </SelectTrigger>
              <SelectContent>
                {FONT_FAMILIES.map((font) => (
                  <SelectItem key={font.value} value={font.value}>
                    <span style={{ fontFamily: font.value }}>{font.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>
        </div>
      </SettingsSection>

      <SettingsSection
        icon={Layout}
        title="UI Density"
        description="Control spacing and layout density"
      >
        <div className="grid grid-cols-3 gap-3">
          {UI_DENSITY_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={uiDensity === option.value ? "default" : "outline"}
              className="h-auto flex-col gap-1 p-4"
              onClick={() => updateSetting("uiDensity", option.value)}
            >
              <span className="font-medium">{option.name}</span>
              <span className="text-xs opacity-70">{option.description}</span>
            </Button>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        icon={Palette}
        title="Accent Color"
        description="Preferred accent color for UI highlights"
      >
        <div className="flex flex-wrap gap-3">
          {ACCENT_COLORS.map((color) => {
            const active = accentColor === color.value
            return (
              <button
                key={color.value}
                className={cn(
                  "flex items-center gap-2 rounded-lg border-2 px-3 py-2",
                  active
                    ? "border-primary ring-2 ring-ring"
                    : "border-border hover:border-primary"
                )}
                onClick={() => updateSetting("accentColor", color.value)}
              >
                <span
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: color.value }}
                />
                <span className="text-sm font-medium">{color.name}</span>
                {active && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            )
          })}
        </div>
      </SettingsSection>

      <SettingsSection
        icon={Zap}
        title="Motion & Accessibility"
        description="Animation and accessibility preferences"
      >
        <div className="space-y-3">
          <SettingRow
            htmlFor="animations-enabled"
            title="Enable Animations"
            description="Smooth transitions and micro-interactions"
            control={
              <Switch
                id="animations-enabled"
                checked={animationsEnabled}
                onCheckedChange={(checked) =>
                  updateSetting("animationsEnabled", checked)
                }
              />
            }
          />
          <SettingRow
            htmlFor="reduced-motion"
            title="Reduced Motion"
            description="Minimize animations for accessibility"
            control={
              <Switch
                id="reduced-motion"
                checked={reducedMotion}
                onCheckedChange={(checked) =>
                  updateSetting("reducedMotion", checked)
                }
              />
            }
          />
          <SettingRow
            htmlFor="high-contrast"
            title="High Contrast Mode"
            description="Increase contrast for better visibility"
            control={
              <Switch
                id="high-contrast"
                checked={highContrast}
                onCheckedChange={(checked) =>
                  updateSetting("highContrast", checked)
                }
              />
            }
          />
        </div>
      </SettingsSection>

      {/* Live preview */}
      <SettingsSection
        icon={Eye}
        title="Live Preview"
        description="How annotation styling will look on the canvas"
      >
        <div className="rounded-lg border border-border bg-muted/40 p-6">
          <div className="relative h-36 overflow-hidden rounded-lg bg-background">
            <div
              className="absolute left-6 top-6 rounded-md p-2"
              style={{
                borderColor: annotationColor,
                borderWidth: `${boxThickness}px`,
                borderStyle: "solid",
                backgroundColor: hexToRgba(annotationColor, 0.1),
                fontSize: `${fontSize}px`,
                fontFamily,
              }}
            >
              <span className="font-medium" style={{ color: annotationColor }}>
                Sample Object
              </span>
            </div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        icon={RotateCcw}
        title="Reset Appearance"
        description="Restore all appearance settings to their defaults"
      >
        <Button
          onClick={handleResetAppearance}
          variant="outline"
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset to Defaults
        </Button>
      </SettingsSection>
    </div>
  )
}

function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace("#", "")
  if (value.length !== 6) return `rgba(59, 130, 246, ${alpha})`
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
