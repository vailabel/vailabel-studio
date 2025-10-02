import { FolderOpen, Save, RotateCcw } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ElectronFileInput } from "@/components/electron-file"
import { useSettingsViewModel } from "@/viewmodels/settings-viewmodel"

export default function GeneralSettings() {
  const { getSettingValue, updateSetting, resetToDefaults } =
    useSettingsViewModel()

  // Get general settings
  const dataDirectory = (getSettingValue("dataDirectory") as string) || ""
  const autoSave = (getSettingValue("autoSave") as boolean) || true
  const showLabels = (getSettingValue("showLabels") as boolean) || true
  const snapToGrid = (getSettingValue("snapToGrid") as boolean) || false

  const handleDataDirectoryChange = (event: {
    target: { files: string[] }
  }) => {
    const dir = event.target.files?.[0]
    if (dir) {
      updateSetting("dataDirectory", dir)
    }
  }

  const handleAutoSaveChange = (checked: boolean) => {
    updateSetting("autoSave", checked)
  }

  const handleShowLabelsChange = (checked: boolean) => {
    updateSetting("showLabels", checked)
  }

  const handleSnapToGridChange = (checked: boolean) => {
    updateSetting("snapToGrid", checked)
  }

  const handleReset = async () => {
    await resetToDefaults()
  }

  return (
    <div className="space-y-6">
      {/* Data Directory */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Data Directory
          </CardTitle>
          <CardDescription>
            Choose where application data will be stored
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start">
            <ElectronFileInput
              onChange={handleDataDirectoryChange}
              accept=""
              multiple={false}
              className="flex-1"
              placeholder="Select a folder..."
            />
          </div>
          <p className="text-sm text-muted-foreground">
            This is the folder where application data (e.g., downloaded files)
            will be stored.
          </p>
          {dataDirectory && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg transition-all duration-200 opacity-100">
              <p className="text-sm text-primary">
                <strong>Selected:</strong> {dataDirectory}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Application Behavior */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Save className="w-5 h-5" />
            Application Behavior
          </CardTitle>
          <CardDescription>
            Configure how the application behaves during use
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auto Save */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-all duration-200 hover:translate-x-1">
            <div className="space-y-1">
              <Label
                htmlFor="auto-save"
                className="text-base font-medium cursor-pointer"
              >
                Auto Save Annotations
              </Label>
              <p className="text-sm text-muted-foreground">
                Automatically save your work as you annotate
              </p>
            </div>
            <Switch
              id="auto-save"
              checked={autoSave}
              onCheckedChange={handleAutoSaveChange}
            />
          </div>

          {/* Show Labels */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-all duration-200 hover:translate-x-1">
            <div className="space-y-1">
              <Label
                htmlFor="show-labels"
                className="text-base font-medium cursor-pointer"
              >
                Show Labels on Annotations
              </Label>
              <p className="text-sm text-muted-foreground">
                Display label names on annotation boxes
              </p>
            </div>
            <Switch
              id="show-labels"
              checked={showLabels}
              onCheckedChange={handleShowLabelsChange}
            />
          </div>

          {/* Snap to Grid */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-all duration-200 hover:translate-x-1">
            <div className="space-y-1">
              <Label
                htmlFor="snap-to-grid"
                className="text-base font-medium cursor-pointer"
              >
                Snap to Grid
              </Label>
              <p className="text-sm text-muted-foreground">
                Align annotations to a grid for better organization
              </p>
            </div>
            <Switch
              id="snap-to-grid"
              checked={snapToGrid}
              onCheckedChange={handleSnapToGridChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            Reset Settings
          </CardTitle>
          <CardDescription>
            Restore all settings to their default values
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="transition-transform duration-200 hover:scale-102 active:scale-98">
            <Button
              onClick={handleReset}
              variant="outline"
              className="w-full border-border hover:bg-muted"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Defaults
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            This will reset all general settings to their default values
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
