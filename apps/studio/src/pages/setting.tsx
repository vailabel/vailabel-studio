import { useRef } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Settings,
  Palette,
  Code,
  Brain,
  Keyboard,
  Cog,
  Save,
  RotateCcw,
  Download,
  Upload,
  AlertCircle,
  Clock,
} from "lucide-react"
import { useSettingsViewModel } from "@/viewmodels/settings-viewmodel"
import GeneralSettings from "@/components/settings/general-settings"
import AppearanceSettings from "@/components/settings/appearance-settings"
import { KeyboardShortcuts } from "@/components/settings/keyboard-shortcuts"
import { ModelSelection } from "@/components/settings/model-selection"
import InstallPythonPackage from "@/components/settings/install-python-pakage"
import AdvancedSettings from "@/components/settings/advanced-settings"

const categoryIcons = {
  general: Settings,
  appearance: Palette,
  python: Code,
  model: Brain,
  shortcuts: Keyboard,
  advanced: Cog,
}

export default function Setting() {
  const {
    categories,
    activeTab,
    searchQuery,
    isSaving,
    hasUnsavedChanges,
    lastSaved,
    error,
    setActiveTab,
    setSearchQuery,
    saveSettings,
    resetToDefaults,
    exportSettings,
    importSettings,
  } = useSettingsViewModel()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImportSettings = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (file) {
      await importSettings(file)
    }
  }

  const handleSave = async () => {
    await saveSettings()
  }

  const handleReset = async () => {
    await resetToDefaults()
  }

  const handleExport = async () => {
    await exportSettings()
  }

  const handleImport = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8 transition-all duration-500 opacity-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Settings
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Customize your application preferences and configuration
              </p>
            </div>

            {/* Status Indicators */}
            <div className="flex items-center gap-4">
              {hasUnsavedChanges && (
                <Badge
                  variant="outline"
                  className="text-amber-600 border-amber-600"
                >
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Unsaved Changes
                </Badge>
              )}

              {lastSaved && (
                <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                  <Clock className="w-3 h-3" />
                  Last saved: {lastSaved.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 transition-all duration-200 opacity-100">
            <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <span className="font-medium">Error</span>
                </div>
                <p className="text-red-600 dark:text-red-400 mt-1">{error}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-8 transition-all duration-500 opacity-100">
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>

          <Button
            onClick={handleReset}
            variant="outline"
            className="border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>

          <Button
            onClick={handleExport}
            variant="outline"
            className="border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Settings
          </Button>

          <Button
            onClick={handleImport}
            variant="outline"
            className="border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import Settings
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportSettings}
            className="hidden"
          />
        </div>

        {/* Settings Tabs */}
        <div className="transition-all duration-500 opacity-100">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-6 mb-8 bg-white dark:bg-gray-800 shadow-sm">
              {categories.map((category) => {
                const IconComponent =
                  categoryIcons[category.id as keyof typeof categoryIcons]
                return (
                  <TabsTrigger
                    key={category.id}
                    value={category.id}
                    className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="hidden sm:inline">{category.name}</span>
                  </TabsTrigger>
                )
              })}
            </TabsList>

            <TabsContent value="general" className="mt-0">
              <div className="transition-all duration-300 opacity-100">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      General Settings
                    </CardTitle>
                    <CardDescription>
                      Basic application settings and preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <GeneralSettings />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="appearance" className="mt-0">
              <div className="transition-all duration-300 opacity-100">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="w-5 h-5" />
                      Appearance Settings
                    </CardTitle>
                    <CardDescription>
                      Customize the look and feel of the application
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AppearanceSettings />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="python" className="mt-0">
              <div className="transition-all duration-300 opacity-100">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="w-5 h-5" />
                      Python Setup
                    </CardTitle>
                    <CardDescription>
                      Configure your Python environment for advanced features
                      and scripting
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <InstallPythonPackage />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="model" className="mt-0">
              <div className="transition-all duration-300 opacity-100">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="w-5 h-5" />
                      Model Selection
                    </CardTitle>
                    <CardDescription>
                      Choose your default AI model for detection and analysis
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ModelSelection />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="shortcuts" className="mt-0">
              <div className="transition-all duration-300 opacity-100">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Keyboard className="w-5 h-5" />
                      Keyboard Shortcuts
                    </CardTitle>
                    <CardDescription>
                      Customize your keyboard shortcuts for faster workflow
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <KeyboardShortcuts />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="mt-0">
              <div className="transition-all duration-300 opacity-100">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Cog className="w-5 h-5" />
                      Advanced Settings
                    </CardTitle>
                    <CardDescription>
                      Configure advanced settings and options
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AdvancedSettings />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
