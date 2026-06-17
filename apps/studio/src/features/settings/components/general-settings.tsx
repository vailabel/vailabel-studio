import { FolderOpen, Save, RotateCcw, RefreshCw, Download } from "lucide-react"
import { Switch } from "@/shared/ui/switch"
import { Button } from "@/shared/ui/button"
import { DesktopFileInput } from "@/shared/components/desktop-file"
import { useSettings } from "@/features/settings/context/settings-context"
import { useUpdate } from "@/shared/ipc/update-context"
import { isDesktopApp } from "@/shared/lib/desktop"
import { SettingsSection, SettingRow } from "@/features/settings/components/settings-ui"

export default function GeneralSettings() {
  const { settings, updateSetting } = useSettings()
  const {
    updateAvailable,
    progress,
    updateDownloaded,
    checking,
    error: updateError,
    upToDate,
    checkForUpdates,
    installUpdate,
    relaunchApp,
  } = useUpdate()

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

      {isDesktopApp() && (
        <SettingsSection
          icon={RefreshCw}
          title="Software Updates"
          description="Check for and install new versions of Vailabel Studio"
        >
          <div className="space-y-3">
            {updateDownloaded ? (
              <Button onClick={relaunchApp} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Restart & Update
              </Button>
            ) : progress ? (
              <Button disabled className="gap-2">
                <Download className="h-4 w-4 animate-pulse" />
                Downloading… {progress.percent.toFixed(0)}%
              </Button>
            ) : updateAvailable ? (
              <Button onClick={installUpdate} className="gap-2">
                <Download className="h-4 w-4" />
                Install update (v{updateAvailable.version})
              </Button>
            ) : (
              <Button
                onClick={checkForUpdates}
                variant="outline"
                disabled={checking}
                className="gap-2"
              >
                <RefreshCw
                  className={`h-4 w-4 ${checking ? "animate-spin" : ""}`}
                />
                {checking ? "Checking…" : "Check for updates"}
              </Button>
            )}

            {updateError ? (
              <p className="text-sm text-destructive">
                Update check failed: {updateError}
              </p>
            ) : upToDate && !updateAvailable ? (
              <p className="text-sm text-muted-foreground">
                You’re on the latest version.
              </p>
            ) : null}
          </div>
        </SettingsSection>
      )}

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
