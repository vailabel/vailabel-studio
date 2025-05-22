"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { X, Trash2, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useTheme } from "./theme-provider"
import { useProjectsStore } from "@/hooks/use-store"

interface SettingsModalProps {
  onClose: () => void
}

interface Settings {
  [key: string]: string | number | boolean
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { toast } = useToast()
  const [isClearing, setIsClearing] = useState(false)
  const { theme, setTheme } = useTheme()
  const data = useProjectsStore()

  const [, setSettings] = useState<Settings>({})
  const [showRulers, setShowRulers] = useState(true)
  const [showCrosshairs, setShowCrosshairs] = useState(true)
  const [showCoordinates, setShowCoordinates] = useState(true)
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)

  // Fetch settings on mount
  useEffect(() => {
    ;(async () => {
      const settingsArray: { key: string; value: string }[] =
        await data.getSettings()
      const loadedSettings: Settings = settingsArray.reduce(
        (acc, { key, value }) => {
          acc[key] = value
          return acc
        },
        {} as Settings
      )
      setSettings(loadedSettings)
      setShowRulers(Boolean(loadedSettings.showRulers ?? true))
      setShowCrosshairs(Boolean(loadedSettings.showCrosshairs ?? true))
      setShowCoordinates(Boolean(loadedSettings.showCoordinates ?? true))
      setBrightness(Number(loadedSettings.brightness ?? 100))
      setContrast(Number(loadedSettings.contrast ?? 100))
    })()
  }, [data])

  // Unified handler for toggles and sliders
  const handleChangeSetting = (
    key: string,
    value: string | number | boolean
  ) => {
    data.updateSetting(key, String(value))
    toast({
      title: "Setting updated",
      description: `${key} has been updated to ${value}`,
    })
  }

  const handleClearAllData = async () => {
    if (
      !confirm(
        "Are you sure you want to clear all data? This action cannot be undone."
      )
    ) {
      return
    }

    setIsClearing(true)

    try {
      // TODO - Implement the actual data clearing logic
      toast({
        title: "Success",
        description: "All data has been cleared",
      })

      // Reload the page to reset the app state
      window.location.reload()
    } catch (error) {
      console.error("Failed to clear data:", error)
      toast({
        title: "Error",
        description: "Failed to clear data",
        variant: "destructive",
      })
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={cn(
          "w-full max-w-lg rounded-lg p-6 shadow-xl",
          "bg-white dark:bg-gray-800 dark:text-gray-100"
        )}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Settings</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        <Tabs defaultValue="general" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="display">Display</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="dark-mode" className="text-base">
                  Dark Mode
                </Label>
                <p
                  className={cn("text-sm", "text-gray-500 dark:text-gray-400")}
                >
                  Use dark theme for the application
                </p>
              </div>
              <Switch
                id="dark-mode"
                checked={theme === "dark"}
                onCheckedChange={(checked) => {
                  setTheme(checked ? "dark" : "light")
                }}
                className="dark-mode-switch"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="keyboard-shortcuts" className="text-base">
                  Keyboard Shortcuts
                </Label>
                <p
                  className={cn("text-sm", "text-gray-500 dark:text-gray-400")}
                >
                  Enable keyboard shortcuts for tools
                </p>
              </div>
              <Switch id="keyboard-shortcuts" defaultChecked />
            </div>
          </TabsContent>

          <TabsContent value="display" className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="show-rulers" className="text-base">
                  Show Rulers
                </Label>
                <p
                  className={cn("text-sm", "text-gray-500 dark:text-gray-400")}
                >
                  Show rulers on the canvas
                </p>
              </div>
              <Switch
                id="show-rulers"
                checked={!!showRulers}
                onCheckedChange={(checked) => {
                  setShowRulers(checked)
                  handleChangeSetting("showRulers", checked)
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="show-crosshairs" className="text-base">
                  Show Crosshairs
                </Label>
                <p
                  className={cn("text-sm", "text-gray-500 dark:text-gray-400")}
                >
                  Show crosshairs when drawing
                </p>
              </div>
              <Switch
                id="show-crosshairs"
                checked={!!showCrosshairs}
                onCheckedChange={(checked) => {
                  setShowCrosshairs(checked)
                  handleChangeSetting("showCrosshairs", checked)
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="show-coordinates" className="text-base">
                  Show Coordinates
                </Label>
                <p
                  className={cn("text-sm", "text-gray-500 dark:text-gray-400")}
                >
                  Show cursor coordinates on canvas
                </p>
              </div>
              <Switch
                id="show-coordinates"
                checked={!!showCoordinates}
                onCheckedChange={(checked) => {
                  setShowCoordinates(checked)
                  handleChangeSetting("showCoordinates", checked)
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brightness" className="text-base">
                Brightness
              </Label>
              <div className="flex items-center gap-2">
                <Sun
                  className={cn("h-4 w-4", "text-gray-500 dark:text-gray-400")}
                />
                <Slider
                  id="brightness"
                  min={50}
                  max={150}
                  step={1}
                  value={[Number(brightness)]}
                  onValueChange={(value) => {
                    setBrightness(value[0])
                    handleChangeSetting("brightness", value[0])
                  }}
                  className="flex-1"
                />
                <span className="w-8 text-right text-sm">{brightness}%</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contrast" className="text-base">
                Contrast
              </Label>
              <div className="flex items-center gap-2">
                <Moon
                  className={cn("h-4 w-4", "text-gray-500 dark:text-gray-400")}
                />
                <Slider
                  id="contrast"
                  min={50}
                  max={150}
                  step={1}
                  value={[Number(contrast)]}
                  onValueChange={(value) => {
                    setContrast(value[0])
                    handleChangeSetting("contrast", value[0])
                  }}
                  className="flex-1"
                />
                <span className="w-8 text-right text-sm">{contrast}%</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="data" className="space-y-4 pt-4">
            <div
              className={cn(
                "rounded-md border p-4",
                "border-gray-200 dark:border-gray-700"
              )}
            >
              <h4 className="font-medium">Clear All Data</h4>
              <p
                className={cn(
                  "mt-1 text-sm",
                  "text-gray-500 dark:text-gray-400"
                )}
              >
                This will delete all projects, images, and labels from your
                browser's local storage. This action cannot be undone.
              </p>
              <Button
                variant="destructive"
                className="mt-4"
                onClick={handleClearAllData}
                disabled={isClearing}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isClearing ? "Clearing..." : "Clear All Data"}
              </Button>
            </div>

            <div
              className={cn(
                "rounded-md border p-4",
                "border-gray-200 dark:border-gray-700"
              )}
            >
              <h4 className="font-medium">Export All Data</h4>
              <p
                className={cn(
                  "mt-1 text-sm",
                  "text-gray-500 dark:text-gray-400"
                )}
              >
                Export all your projects, images, and labels as a JSON file.
              </p>
              <Button className="mt-4">Export Data</Button>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}
