import { useState, useEffect, useRef } from "react"
import { 
  Moon, 
  Sun, 
  Palette, 
  Eye, 
  EyeOff, 
  Type, 
  Layout, 
  Zap, 
  Accessibility,
  Monitor,
  Smartphone,
  Tablet,
  RotateCcw,
  CheckCircle2
} from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChromePicker } from "react-color"
import { Check } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { useSettingsViewModel } from "@/viewmodels/settings-viewmodel"

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

const ACCENT_COLORS = [
  { name: "Blue", value: "#3b82f6", bg: "bg-blue-500" },
  { name: "Green", value: "#10b981", bg: "bg-green-500" },
  { name: "Purple", value: "#a855f7", bg: "bg-purple-500" },
  { name: "Orange", value: "#f59e42", bg: "bg-orange-500" },
  { name: "Red", value: "#ef4444", bg: "bg-red-500" },
  { name: "Pink", value: "#ec4899", bg: "bg-pink-500" },
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
  { name: "Compact", value: "compact", description: "Tighter spacing for more content" },
  { name: "Comfortable", value: "comfortable", description: "Balanced spacing (recommended)" },
  { name: "Spacious", value: "spacious", description: "More breathing room" },
]

export default function AppearanceSettings() {
  const { theme, setTheme } = useTheme()
  const {
    getSettingValue,
    updateSetting,
  } = useSettingsViewModel()

  const [showCustomColor, setShowCustomColor] = useState(false)
  const customBtnRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Get appearance settings
  const brightness = getSettingValue("brightness") as number || 100
  const contrast = getSettingValue("contrast") as number || 100
  const annotationColor = getSettingValue("annotationColor") as string || "#3b82f6"
  const boxThickness = getSettingValue("boxThickness") as number || 2
  const accentColor = getSettingValue("accentColor") as string || "#3b82f6"
  const fontSize = getSettingValue("fontSize") as number || 14
  const fontFamily = getSettingValue("fontFamily") as string || "system-ui"
  const uiDensity = getSettingValue("uiDensity") as string || "comfortable"
  const animationsEnabled = getSettingValue("animationsEnabled") as boolean || true
  const reducedMotion = getSettingValue("reducedMotion") as boolean || false
  const highContrast = getSettingValue("highContrast") as boolean || false

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

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme as "light" | "dark" | "system")
    updateSetting("theme", newTheme)
  }

  const handleBrightnessChange = (value: number[]) => {
    updateSetting("brightness", value[0])
  }

  const handleContrastChange = (value: number[]) => {
    updateSetting("contrast", value[0])
  }

  const handleColorChange = (color: string) => {
    updateSetting("annotationColor", color)
    setShowCustomColor(false)
  }

  const handleBoxThicknessChange = (value: number) => {
    updateSetting("boxThickness", value)
  }

  const handleAccentColorChange = (color: string) => {
    updateSetting("accentColor", color)
  }

  const handleFontSizeChange = (value: number[]) => {
    updateSetting("fontSize", value[0])
  }

  const handleFontFamilyChange = (family: string) => {
    updateSetting("fontFamily", family)
  }

  const handleUIDensityChange = (density: string) => {
    updateSetting("uiDensity", density)
  }

  const handleAnimationsChange = (enabled: boolean) => {
    updateSetting("animationsEnabled", enabled)
  }

  const handleReducedMotionChange = (enabled: boolean) => {
    updateSetting("reducedMotion", enabled)
  }

  const handleHighContrastChange = (enabled: boolean) => {
    updateSetting("highContrast", enabled)
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
      {/* Theme Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Theme
          </CardTitle>
          <CardDescription>
            Choose your preferred application theme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              className="h-20 flex flex-col gap-2"
              onClick={() => handleThemeChange("light")}
            >
              <Sun className="w-6 h-6" />
              <span>Light</span>
            </Button>
            
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              className="h-20 flex flex-col gap-2"
              onClick={() => handleThemeChange("dark")}
            >
              <Moon className="w-6 h-6" />
              <span>Dark</span>
            </Button>
            
            <Button
              variant={theme === "system" ? "default" : "outline"}
              className="h-20 flex flex-col gap-2"
              onClick={() => handleThemeChange("system")}
            >
              <Eye className="w-6 h-6" />
              <span>System</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Image Adjustments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Image Adjustments
          </CardTitle>
          <CardDescription>
            Adjust brightness and contrast for better visibility
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Brightness */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="brightness" className="text-base font-medium">
                Brightness
              </Label>
              <span className="text-sm text-muted-foreground">
                {brightness}%
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Sun className="h-4 w-4 text-muted-foreground" />
              <Slider
                id="brightness"
                min={50}
                max={150}
                step={1}
                value={[brightness]}
                onValueChange={handleBrightnessChange}
                className="flex-1"
              />
              <Moon className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Contrast */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="contrast" className="text-base font-medium">
                Contrast
              </Label>
              <span className="text-sm text-muted-foreground">
                {contrast}%
              </span>
            </div>
            <div className="flex items-center gap-3">
              <EyeOff className="h-4 w-4 text-muted-foreground" />
              <Slider
                id="contrast"
                min={50}
                max={150}
                step={1}
                value={[contrast]}
                onValueChange={handleContrastChange}
                className="flex-1"
              />
              <Eye className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Annotation Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Annotation Colors
          </CardTitle>
          <CardDescription>
            Customize the default colors for annotations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Default Annotation Color */}
          <div className="space-y-3">
            <Label htmlFor="annotation-color" className="text-base font-medium">
              Default Annotation Color
            </Label>
            <div className="flex flex-wrap items-center gap-3 relative">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`relative h-10 w-10 rounded-full border-2 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-ring transition-colors ${
                    annotationColor === color && !showCustomColor 
                      ? "border-primary ring-2 ring-ring" 
                      : "border-border hover:border-primary"
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select ${color} as annotation color`}
                  onClick={() => handleColorChange(color)}
                >
                  {annotationColor === color && !showCustomColor && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Check className="h-5 w-5 text-white drop-shadow-lg" />
                    </span>
                  )}
                </button>
              ))}
              
              <button
                ref={customBtnRef}
                type="button"
                className={`h-10 px-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-sm font-medium bg-background border-border hover:border-primary transition-colors
                  ${showCustomColor ? "border-primary ring-2 ring-ring" : ""}`}
                onClick={() => setShowCustomColor((v) => !v)}
                aria-label="Custom color picker"
              >
                Custom...
              </button>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Current:</span>
                <div
                  className="h-8 w-8 rounded-full border-2 border-border inline-block align-middle"
                  style={{ backgroundColor: annotationColor }}
                  title="Current color"
                />
              </div>
              
              {showCustomColor && (
                <div
                  ref={popoverRef}
                  className="absolute z-50 left-0 top-12 sm:left-auto sm:right-0 sm:top-12 bg-background border border-border rounded-lg shadow-lg p-3"
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

          {/* Box Thickness */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="box-thickness" className="text-base font-medium">
                Box Thickness
              </Label>
              <span className="text-sm text-muted-foreground">
                {boxThickness}px
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">1px</span>
              <Slider
                id="box-thickness"
                min={1}
                max={10}
                step={1}
                value={[boxThickness]}
                onValueChange={(value) => handleBoxThicknessChange(value[0])}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">10px</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Typography */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="w-5 h-5" />
            Typography
          </CardTitle>
          <CardDescription>
            Customize text appearance and readability
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Font Size */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="font-size" className="text-base font-medium">
                Font Size
              </Label>
              <span className="text-sm text-muted-foreground">
                {fontSize}px
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">12px</span>
              <Slider
                id="font-size"
                min={12}
                max={20}
                step={1}
                value={[fontSize]}
                onValueChange={handleFontSizeChange}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">20px</span>
            </div>
          </div>

          {/* Font Family */}
          <div className="space-y-3">
            <Label htmlFor="font-family" className="text-base font-medium">
              Font Family
            </Label>
            <Select value={fontFamily} onValueChange={handleFontFamilyChange}>
              <SelectTrigger>
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
          </div>
        </CardContent>
      </Card>

      {/* UI Density */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layout className="w-5 h-5" />
            UI Density
          </CardTitle>
          <CardDescription>
            Control spacing and layout density
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {UI_DENSITY_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={uiDensity === option.value ? "default" : "outline"}
                className="h-auto p-4 flex flex-col gap-2 text-left"
                onClick={() => handleUIDensityChange(option.value)}
              >
                <span className="font-medium">{option.name}</span>
                <span className="text-xs opacity-70">{option.description}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Accent Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Accent Colors
          </CardTitle>
          <CardDescription>
            Choose your preferred accent color for UI elements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {ACCENT_COLORS.map((color) => (
              <button
                key={color.value}
                className={`relative p-4 rounded-lg border-2 transition-colors ${
                  accentColor === color.value
                    ? "border-primary ring-2 ring-ring"
                    : "border-border hover:border-primary"
                }`}
                onClick={() => handleAccentColorChange(color.value)}
              >
                <div className={`w-full h-8 rounded ${color.bg} mb-2`} />
                <span className="text-sm font-medium">{color.name}</span>
                {accentColor === color.value && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 className="w-4 h-4 text-white drop-shadow-lg" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Animations & Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Animations & Performance
          </CardTitle>
          <CardDescription>
            Control animations and performance preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable Animations */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
            <div className="space-y-1">
              <Label htmlFor="animations-enabled" className="text-base font-medium cursor-pointer">
                Enable Animations
              </Label>
              <p className="text-sm text-muted-foreground">
                Smooth transitions and micro-interactions
              </p>
            </div>
            <Switch
              id="animations-enabled"
              checked={animationsEnabled}
              onCheckedChange={handleAnimationsChange}
            />
          </div>

          {/* Reduced Motion */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
            <div className="space-y-1">
              <Label htmlFor="reduced-motion" className="text-base font-medium cursor-pointer">
                Reduced Motion
              </Label>
              <p className="text-sm text-muted-foreground">
                Minimize animations for accessibility
              </p>
            </div>
            <Switch
              id="reduced-motion"
              checked={reducedMotion}
              onCheckedChange={handleReducedMotionChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Accessibility */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Accessibility className="w-5 h-5" />
            Accessibility
          </CardTitle>
          <CardDescription>
            Improve accessibility and usability
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* High Contrast */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
            <div className="space-y-1">
              <Label htmlFor="high-contrast" className="text-base font-medium cursor-pointer">
                High Contrast Mode
              </Label>
              <p className="text-sm text-muted-foreground">
                Increase contrast for better visibility
              </p>
            </div>
            <Switch
              id="high-contrast"
              checked={highContrast}
              onCheckedChange={handleHighContrastChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Live Preview
          </CardTitle>
          <CardDescription>
            See how your settings will look in the application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Application Mockup */}
            <div className="relative bg-muted rounded-lg p-6 overflow-hidden border border-border">
              {/* Mock Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-lg"
                    style={{ backgroundColor: accentColor }}
                  />
                  <div>
                    <div 
                      className="h-3 rounded mb-1"
                      style={{ 
                        backgroundColor: accentColor,
                        width: "120px",
                        opacity: 0.8
                      }}
                    />
                    <div 
                      className="h-2 rounded"
                      style={{ 
                        backgroundColor: accentColor,
                        width: "80px",
                        opacity: 0.5
                      }}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded bg-muted-foreground/20" />
                  <div className="w-6 h-6 rounded bg-muted-foreground/20" />
                  <div className="w-6 h-6 rounded bg-muted-foreground/20" />
                </div>
              </div>

              {/* Mock Content Area */}
              <div className="space-y-4">
                {/* Sample Image with Annotation */}
                <div className="relative bg-background rounded-lg p-4 border border-border">
                  <div className="relative h-32 bg-muted rounded-lg overflow-hidden">
                    {/* Sample Annotation */}
                    <div
                      className="absolute top-4 left-4 border-2 rounded-lg p-2"
                      style={{
                        borderColor: annotationColor,
                        borderWidth: `${boxThickness}px`,
                        backgroundColor: `rgba(${parseInt(annotationColor.slice(1, 3), 16)}, ${parseInt(annotationColor.slice(3, 5), 16)}, ${parseInt(annotationColor.slice(5, 7), 16)}, 0.1)`,
                        fontSize: `${fontSize}px`,
                        fontFamily: fontFamily,
                      }}
                    >
                      <span className="font-medium" style={{ color: annotationColor }}>
                        Sample Object
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mock Controls */}
                <div className="flex items-center gap-3">
                  <div 
                    className="px-4 py-2 rounded-lg text-primary-foreground font-medium"
                    style={{ backgroundColor: accentColor }}
                  >
                    Save
                  </div>
                  <div className="px-4 py-2 rounded-lg border border-border text-foreground font-medium">
                    Cancel
                  </div>
                </div>

                {/* Mock Sidebar */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border border-border bg-background">
                    <div className="flex items-center gap-2 mb-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: accentColor }}
                      />
                      <span className="text-sm font-medium">Label 1</span>
                    </div>
                    <div className="text-xs text-muted-foreground">5 items</div>
                  </div>
                  <div className="p-3 rounded-lg border border-border bg-background">
                    <div className="flex items-center gap-2 mb-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: "#10b981" }}
                      />
                      <span className="text-sm font-medium">Label 2</span>
                    </div>
                    <div className="text-xs text-muted-foreground">3 items</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Device Preview */}
            <div className="flex justify-center gap-6">
              <div className="flex flex-col items-center gap-3 p-4 rounded-lg border border-border bg-background">
                <Monitor className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm font-medium">Desktop</span>
                <div className="text-xs text-muted-foreground">1920×1080</div>
              </div>
              <div className="flex flex-col items-center gap-3 p-4 rounded-lg border border-border bg-background">
                <Tablet className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm font-medium">Tablet</span>
                <div className="text-xs text-muted-foreground">768×1024</div>
              </div>
              <div className="flex flex-col items-center gap-3 p-4 rounded-lg border border-border bg-background">
                <Smartphone className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm font-medium">Mobile</span>
                <div className="text-xs text-muted-foreground">375×667</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reset */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            Reset Appearance
          </CardTitle>
          <CardDescription>
            Restore all appearance settings to their default values
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleResetAppearance}
            variant="outline"
            className="w-full"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            This will reset all appearance settings to their default values
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
