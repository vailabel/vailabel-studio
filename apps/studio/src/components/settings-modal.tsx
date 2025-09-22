import { useState, useEffect } from "react"
import { X, Trash2, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useTheme } from "./theme-provider"
import { useServices } from "@/services/ServiceProvider"

interface SettingsModalProps {
  onClose: () => void
}

interface Settings {
  [key: string]: string | number | boolean
}

export const SettingsModal = ({ onClose }: SettingsModalProps) => {
  const { toast } = useToast()
  const [isClearing, setIsClearing] = useState(false)
  const { theme, setTheme } = useTheme()
  const services = useServices()

  const [showRulers, setShowRulers] = useState(true)
  const [showCrosshairs, setShowCrosshairs] = useState(true)
  const [showCoordinates, setShowCoordinates] = useState(true)
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)

  // Fetch settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsArray = await services.getSettingsService().getSettings()
        const loadedSettings: Settings = settingsArray.reduce(
          (acc, { key, value }) => {
            acc[key] = value
            return acc
          },
          {} as Settings
        )
        // Only update local state, not the store, to avoid type mismatch
        setShowRulers(Boolean(loadedSettings.showRulers ?? true))
        setShowCrosshairs(Boolean(loadedSettings.showCrosshairs ?? true))
        setShowCoordinates(Boolean(loadedSettings.showCoordinates ?? true))
        setBrightness(Number(loadedSettings.brightness ?? 100))
        setContrast(Number(loadedSettings.contrast ?? 100))
      } catch (error) {
        console.error("Failed to load settings:", error)
      }
    }
    loadSettings()
  }, [])

  // Unified handler for toggles and sliders
  const handleChangeSetting = async (
    key: string,
    value: string | number | boolean
  ) => {
    try {
      // Convert value to string for updateSetting
      await services.getSettingsService().saveOrUpdateSetting(key, String(value))
      toast({
        title: "Setting updated",
        description: `${key} has been updated to ${value}`,
      })
    } catch (error) {
      console.error("Failed to save setting:", error)
      toast({
        title: "Error",
        description: "Failed to save setting",
        variant: "destructive",
      })
    }
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
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your application preferences
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="display">Display</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="dark-mode" className="text-base">
                  Dark Mode
                </Label>
                <p
                  className={cn("text-sm", "text-muted-foreground")}
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
                  className={cn("text-sm", "text-muted-foreground")}
                >
                  Enable keyboard shortcuts for tools
                </p>
              </div>
              <Switch id="keyboard-shortcuts" defaultChecked />
            </div>
          </TabsContent>

          <TabsContent value="display" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="show-rulers" className="text-base">
                  Show Rulers
                </Label>
                <p
                  className={cn("text-sm", "text-muted-foreground")}
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
                  className={cn("text-sm", "text-muted-foreground")}
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
                  className={cn("text-sm", "text-muted-foreground")}
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
                  className={cn("h-4 w-4", "text-muted-foreground")}
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
                  className={cn("h-4 w-4", "text-muted-foreground")}
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

          <TabsContent value="data" className="space-y-4">
            <Alert>
              <AlertDescription>
                <h4 className="font-medium">Clear All Data</h4>
                <p className="mt-1 text-sm text-muted-foreground">
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
              </AlertDescription>
            </Alert>

            <Alert>
              <AlertDescription>
                <h4 className="font-medium">Export All Data</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Export all your projects, images, and labels as a JSON file.
                </p>
                <Button className="mt-4">Export Data</Button>
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
