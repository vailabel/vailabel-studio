import { FolderOpen, Save, RotateCcw } from "lucide-react"
import { Switch } from "@/shared/ui/switch"
import { Button } from "@/shared/ui/button"
import { DesktopFileInput } from "@/shared/components/desktop-file"
import { useSettings } from "@/features/settings/context/settings-context"
import { SettingsSection, SettingRow } from "@/features/settings/components/settings-ui"

export default function GeneralSettings() {
  const { settings, updateSetting } = useSettings()

  const dataDirectory = (settings.dataDirectory as string) || ""
  const autoSave = (settings.autoSave as boolean) ?? true
  const showLabels = (settings.showLabels as boolean) ?? true
  const snapToGrid = (settings.snapToGrid as boolean) ?? false

  const handleDataDirectoryChange = (event: {
    target: { files: string[] }
  }) => {
    const dir = event.target.files?.[0]
    if (dir) updateSetting("dataDirectory", dir)
  }

  const handleReset = async () => {
    await updateSetting("autoSave", true)
    await updateSetting("showLabels", true)
    await updateSetting("snapToGrid", false)
  }

  return (
    <div className="space-y-6">
      <SettingsSection
        icon={FolderOpen}
        title="Data Directory"
        description="Where application data (downloads, exports) is stored"
      >
        <div className="space-y-3">
          <DesktopFileInput
            onChange={handleDataDirectoryChange}
            accept=""
            multiple={false}
            className="flex-1"
            placeholder="Select a folder…"
            options={{ properties: ["openDirectory"] }}
          />
          {dataDirectory && (
            <div className="rounded-lg border border-primary/20 bg-primary/10 p-3 text-sm text-primary">
              <span className="font-medium">Selected:</span> {dataDirectory}
            </div>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        icon={Save}
        title="Application Behavior"
        description="Configure how the application behaves during use"
      >
        <div className="space-y-3">
          <SettingRow
            htmlFor="auto-save"
            title="Auto Save Annotations"
            description="Automatically save your work as you annotate"
            control={
              <Switch
                id="auto-save"
                checked={autoSave}
                onCheckedChange={(checked) => updateSetting("autoSave", checked)}
              />
            }
          />
          <SettingRow
            htmlFor="show-labels"
            title="Show Labels on Annotations"
            description="Display label names on annotation boxes"
            control={
              <Switch
                id="show-labels"
                checked={showLabels}
                onCheckedChange={(checked) =>
                  updateSetting("showLabels", checked)
                }
              />
            }
          />
          <SettingRow
            htmlFor="snap-to-grid"
            title="Snap to Grid"
            description="Align annotations to a grid for better organization"
            control={
              <Switch
                id="snap-to-grid"
                checked={snapToGrid}
                onCheckedChange={(checked) =>
                  updateSetting("snapToGrid", checked)
                }
              />
            }
          />
        </div>
      </SettingsSection>

      <SettingsSection
        icon={RotateCcw}
        title="Reset General Settings"
        description="Restore the settings on this tab to their defaults"
      >
        <Button onClick={handleReset} variant="outline" className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Reset to Defaults
        </Button>
      </SettingsSection>
    </div>
  )
}
