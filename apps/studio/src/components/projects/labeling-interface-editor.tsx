import { lazy, memo, Suspense, useState } from "react"
import { Wand2, Code2, AlertTriangle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CONFIG_PRESETS } from "@/lib/label-config/presets"
import { serializeConfig } from "@/lib/label-config/generate"
import type { LabelConfig } from "@/lib/label-config/types"
import { VisualConfigEditor } from "./visual-config-editor"
import { LabelingPreview } from "./labeling-preview"

// CodeMirror + the JSON-schema tooling (shiki, markdown-it) are heavy; load the
// code editor only when the Code tab is actually opened.
const JsonConfigEditor = lazy(
  () => import("@/components/studio/editors/custom/json-config-editor")
)

// The labeling-interface editor for the create flow's setup step — Label Studio
// style. Left: a Visual (no-code) tab and a Code (JSON / XML) tab over the same
// config string. Right: a live preview rendered from the parsed config.
export const LabelingInterfaceEditor = memo(
  ({
    value,
    onChange,
    config,
    error,
  }: {
    value: string
    onChange: (next: string) => void
    config: LabelConfig | null
    error: string | null
  }) => {
    const [tab, setTab] = useState("visual")

    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Editor */}
        <Tabs value={tab} onValueChange={(next) => setTab(next as string)}>
          <TabsList className="w-full">
            <TabsTrigger value="visual" className="gap-1.5">
              <Wand2 className="size-3.5" />
              Visual
            </TabsTrigger>
            <TabsTrigger value="code" className="gap-1.5">
              <Code2 className="size-3.5" />
              Code
            </TabsTrigger>
          </TabsList>

          <TabsContent value="visual">
            <div className="max-h-[28rem] overflow-y-auto pr-1">
              {config && config.objects.length > 0 ? (
                <VisualConfigEditor
                  config={config}
                  onChange={(next) => onChange(serializeConfig(next))}
                />
              ) : (
                <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-6 text-center">
                  <AlertTriangle className="size-5 text-muted-foreground" />
                  <p className="text-sm font-medium">Can't edit visually</p>
                  <p className="text-xs text-muted-foreground">
                    {error ??
                      "Add a data object and at least one control in the Code tab."}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="code">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-1.5">
                <span className="self-center text-xs text-muted-foreground">
                  Presets:
                </span>
                {CONFIG_PRESETS.map((preset) => (
                  <Button
                    key={preset.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    title={preset.description}
                    onClick={() => onChange(preset.config)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <Suspense
                fallback={
                  <div className="h-[18rem] rounded-md border border-border" />
                }
              >
                <JsonConfigEditor value={value} onChange={onChange} />
              </Suspense>
              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : config ? (
                <div className="flex flex-wrap gap-1">
                  {config.objects.map((object) => (
                    <Badge key={object.name} variant="secondary" className="text-xs">
                      {object.tag}
                    </Badge>
                  ))}
                  {config.controls.map((control) => (
                    <Badge key={control.name} className="text-xs">
                      {control.tag}
                    </Badge>
                  ))}
                </div>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Accepts native JSON or Label Studio XML.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Preview */}
        <LabelingPreview config={config} />
      </div>
    )
  }
)

LabelingInterfaceEditor.displayName = "LabelingInterfaceEditor"
