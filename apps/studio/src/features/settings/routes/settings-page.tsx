import { useRef } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs"
import { Button } from "@/shared/ui/button"
import {
  Settings as SettingsIcon,
  Palette,
  Sparkles,
  Zap,
  Keyboard,
  Cog,
  Cloud,
  RotateCcw,
  Download,
  Upload,
  AlertCircle,
  Check,
} from "lucide-react"
import { SettingsProvider, useSettings } from "@/features/settings/context/settings-context"
import GeneralSettings from "@/features/settings/components/general-settings"
import AppearanceSettings from "@/features/settings/components/appearance-settings"
import { KeyboardShortcuts } from "@/features/settings/components/keyboard-shortcuts"
import AdvancedSettings from "@/features/settings/components/advanced-settings"
import CloudStorageSettings from "@/features/settings/components/cloud-storage-settings"
import CopilotSettings from "@/features/settings/components/copilot-settings"
import RuntimeSettings from "@/features/settings/components/runtime-settings"

const CATEGORY_ICONS = {
  general: SettingsIcon,
  appearance: Palette,
  copilot: Sparkles,
  runtime: Zap,
  shortcuts: Keyboard,
  cloud: Cloud,
  advanced: Cog,
} as const

export default function Setting() {
  return (
    <SettingsProvider>
      <SettingsView />
    </SettingsProvider>
  )
}

function SettingsView() {
  const {
    categories,
    activeTab,
    isSaving,
    lastSaved,
    error,
    setActiveTab,
    resetToDefaults,
    keyboardShortcutsList,
    updateKeyboardShortcuts,
    exportSettings,
    importSettings,
  } = useSettings()

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImportFile = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (file) await importSettings(file)
    event.target.value = ""
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground">
              Customize your application preferences and configuration
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground mr-1">
              {isSaving ? (
                <RotateCcw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5 text-success" />
              )}
              {isSaving
                ? "Saving…"
                : lastSaved
                  ? `Saved ${lastSaved.toLocaleTimeString()}`
                  : "Changes save automatically"}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportSettings()}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Import
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => resetToDefaults()}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Something went wrong</p>
              <p className="text-destructive/80">{error}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="overflow-x-auto pb-2">
            <TabsList className="grid w-full min-w-[700px] grid-cols-7">
              {categories.map((category) => {
                const Icon =
                  CATEGORY_ICONS[category.id as keyof typeof CATEGORY_ICONS]
                return (
                  <TabsTrigger
                    key={category.id}
                    value={category.id}
                    className="gap-2"
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    <span className="hidden sm:inline">{category.name}</span>
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </div>

          <TabsContent value="general" className="mt-6">
            <GeneralSettings />
          </TabsContent>
          <TabsContent value="appearance" className="mt-6">
            <AppearanceSettings />
          </TabsContent>
          <TabsContent value="copilot" className="mt-6">
            <CopilotSettings />
          </TabsContent>
          <TabsContent value="runtime" className="mt-6">
            <RuntimeSettings />
          </TabsContent>
          <TabsContent value="shortcuts" className="mt-6">
            <KeyboardShortcuts
              shortcuts={keyboardShortcutsList}
              onChange={updateKeyboardShortcuts}
            />
          </TabsContent>
          <TabsContent value="cloud" className="mt-6">
            <CloudStorageSettings />
          </TabsContent>
          <TabsContent value="advanced" className="mt-6">
            <AdvancedSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
