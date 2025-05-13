import { useState } from "react"
import { Moon, Sun, Trash2 } from "lucide-react"
import MainLayout from "./main-layout"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { useTheme } from "@/components/theme-provider"
import { useToast } from "@/hooks/use-toast"

export default function Setting() {
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [isClearing, setIsClearing] = useState(false)

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
      // Simulate clearing data
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast({
        title: "Success",
        description: "All data has been cleared.",
      })
    } catch (error) {
      console.error("Failed to clear data:", error)
      toast({
        title: "Error",
        description: "Failed to clear data.",
        variant: "destructive",
      })
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        <div className="space-y-6">
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
              onCheckedChange={(checked) =>
                setTheme(checked ? "dark" : "light")
              }
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
                onValueChange={(value) => setBrightness(value[0])}
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
                onValueChange={(value) => setContrast(value[0])}
                className="flex-1"
              />
              <span className="w-8 text-right text-sm">{contrast}%</span>
            </div>
          </div>

          {/* Clear Data */}
          <div className="border-t pt-4">
            <h4 className="font-medium">Clear All Data</h4>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              This will delete all data from your browser's local storage. This
              action cannot be undone.
            </p>
            <button
              onClick={handleClearAllData}
              disabled={isClearing}
              className="mt-4 px-4 py-2 text-white bg-red-600 rounded hover:bg-red-700 disabled:bg-red-400"
            >
              <Trash2 className="inline-block mr-2 h-4 w-4" />
              {isClearing ? "Clearing..." : "Clear All Data"}
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
