import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import GeneralSettings from "@/components/settings/general-settings"
import { KeyboardShortcuts } from "@/components/settings/keyboard-shortcuts"
import { ModelSelection } from "@/components/settings/model-selection"
import InstallPythonPackage from "@/components/settings/install-python-pakage"
import AdvancedSettings from "@/components/settings/advanced-settings"

export default function Setting() {
  const [tab, setTab] = useState("general")

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="python">Python Setup</TabsTrigger>
          <TabsTrigger value="model">Model Selection</TabsTrigger>
          <TabsTrigger value="shortcuts">Keyboard Shortcuts</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <GeneralSettings />
        </TabsContent>
        <TabsContent value="python">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Python Setup</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure your Python environment for advanced features and
              scripting.
            </p>
            <InstallPythonPackage />
          </div>
        </TabsContent>
        <TabsContent value="model">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Model Selection</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Choose your default AI model for detection and analysis.
            </p>
            <ModelSelection />
          </div>
        </TabsContent>
        <TabsContent value="shortcuts">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Customize your keyboard shortcuts for faster workflow.
            </p>
            <KeyboardShortcuts />
          </div>
        </TabsContent>
        <TabsContent value="advanced">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Advanced Settings</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure advanced settings and options.
            </p>
            <AdvancedSettings />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
