"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { X, Trash2, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { useSettingsStore } from "@/lib/settings-store"
import { db } from "@/lib/db"
import { useToast } from "@/hooks/use-toast"

interface SettingsModalProps {
  onClose: () => void
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { toast } = useToast()
  const [isClearing, setIsClearing] = useState(false)

  const {
    darkMode,
    setDarkMode,
    showRulers,
    setShowRulers,
    showCrosshairs,
    setShowCrosshairs,
    showCoordinates,
    setShowCoordinates,
    brightness,
    setBrightness,
    contrast,
    setContrast,
  } = useSettingsStore()

  const handleClearAllData = async () => {
    if (!confirm("Are you sure you want to clear all data? This action cannot be undone.")) {
      return
    }

    setIsClearing(true)

    try {
      await db.delete()
      await db.open()

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
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
                <p className="text-sm text-gray-500">Use dark theme for the application</p>
              </div>
              <Switch id="dark-mode" checked={darkMode} onCheckedChange={setDarkMode} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="keyboard-shortcuts" className="text-base">
                  Keyboard Shortcuts
                </Label>
                <p className="text-sm text-gray-500">Enable keyboard shortcuts for tools</p>
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
                <p className="text-sm text-gray-500">Show rulers on the canvas</p>
              </div>
              <Switch id="show-rulers" checked={showRulers} onCheckedChange={setShowRulers} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="show-crosshairs" className="text-base">
                  Show Crosshairs
                </Label>
                <p className="text-sm text-gray-500">Show crosshairs when drawing</p>
              </div>
              <Switch id="show-crosshairs" checked={showCrosshairs} onCheckedChange={setShowCrosshairs} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="show-coordinates" className="text-base">
                  Show Coordinates
                </Label>
                <p className="text-sm text-gray-500">Show cursor coordinates on canvas</p>
              </div>
              <Switch id="show-coordinates" checked={showCoordinates} onCheckedChange={setShowCoordinates} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brightness" className="text-base">
                Brightness
              </Label>
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4 text-gray-500" />
                <Slider
                  id="brightness"
                  min={50}
                  max={150}
                  step={1}
                  value={[brightness]}
                  onValueChange={(value) => setBrightness(value[0])}
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
                <Moon className="h-4 w-4 text-gray-500" />
                <Slider
                  id="contrast"
                  min={50}
                  max={150}
                  step={1}
                  value={[contrast]}
                  onValueChange={(value) => setContrast(value[0])}
                  className="flex-1"
                />
                <span className="w-8 text-right text-sm">{contrast}%</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="data" className="space-y-4 pt-4">
            <div className="rounded-md border border-gray-200 p-4">
              <h4 className="font-medium">Clear All Data</h4>
              <p className="mt-1 text-sm text-gray-500">
                This will delete all projects, images, and labels from your browser's local storage. This action cannot
                be undone.
              </p>
              <Button variant="destructive" className="mt-4" onClick={handleClearAllData} disabled={isClearing}>
                <Trash2 className="mr-2 h-4 w-4" />
                {isClearing ? "Clearing..." : "Clear All Data"}
              </Button>
            </div>

            <div className="rounded-md border border-gray-200 p-4">
              <h4 className="font-medium">Export All Data</h4>
              <p className="mt-1 text-sm text-gray-500">Export all your projects, images, and labels as a JSON file.</p>
              <Button className="mt-4">Export Data</Button>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}
