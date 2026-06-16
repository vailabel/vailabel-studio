import { memo, useEffect, useMemo } from "react"
import { SlidersHorizontal } from "lucide-react"
import { allowImageDirectory } from "@/shared/lib/desktop"
import type { EditorProps } from "./types"
import { StandaloneControls } from "@/shared/components/label-config/standalone-controls"
import { RelationsPanel } from "./custom/relations-panel"
import { Notice } from "./custom/config-notice"
import { PrimaryObject } from "./custom/primary-object"
import { StaticObjects } from "./custom/static-objects"
import { deriveConfigLayout } from "./custom/config-layout"
import { useConfigResults } from "./custom/use-config-results"
import { useParsedConfig } from "./custom/use-parsed-config"

function fileDir(filePath: string): string {
  return filePath.replace(/[\\/][^\\/]*$/, "") || filePath
}

// Config-driven editor: parses the project's JSON (or XML) labeling config and
// renders object viewers + control widgets from it, storing every result in the
// generic Label Studio-style envelope (annotation.meta kind "result").
export const CustomEditor = memo(({ viewModel }: EditorProps) => {
  const doc = viewModel.data.image
  const { annotations } = viewModel.data
  const rawConfig = viewModel.project?.settings?.labelConfig as string | undefined

  const parsed = useParsedConfig(rawConfig)
  const results = useConfigResults(annotations, viewModel)

  // Ensure asset access for media objects (image/audio) on reopen.
  useEffect(() => {
    if (doc?.path) void allowImageDirectory(fileDir(doc.path)).catch(() => {})
  }, [doc?.path])

  const layout = useMemo(
    () => (parsed.config ? deriveConfigLayout(parsed.config, annotations) : null),
    [parsed.config, annotations]
  )

  if (!doc) {
    return (
      <div className="flex flex-1 items-center justify-center bg-muted">
        <p className="text-muted-foreground">No items in this project</p>
      </div>
    )
  }

  if (parsed.error) {
    return (
      <Notice icon="error" title="Labeling config error">
        {parsed.error}
      </Notice>
    )
  }
  const config = parsed.config
  if (!config || config.objects.length === 0 || !layout) {
    return (
      <Notice icon="info" title="No labeling config">
        This project has no labeling config. Add one in the project settings.
      </Notice>
    )
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-background">
      <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-2 text-sm">
        <SlidersHorizontal className="size-4 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate font-medium" title={doc.name}>
          {doc.name}
        </span>
        <span className="text-xs text-muted-foreground">
          {config.controls.length} control
          {config.controls.length === 1 ? "" : "s"}
        </span>
      </div>

      <StaticObjects objects={layout.staticObjects} />

      <PrimaryObject
        primary={layout.primary}
        doc={doc}
        controls={layout.primary ? layout.spatialControlsFor(layout.primary.name) : []}
        annotations={annotations}
        onCreateRegion={results.addRegion}
        onCreateSpan={results.createSpan}
        onDeleteRegion={viewModel.deleteAnnotation}
      />

      <StandaloneControls
        controls={layout.standalone}
        api={{
          valueFor: results.valueFor,
          onSet: results.setControlValue,
          onClear: results.clearControlValue,
        }}
      />

      {layout.relationsControl && (
        <RelationsPanel
          regions={layout.regionInfos}
          relations={layout.relationInfos}
          onLink={(fromId, toId) =>
            results.createRelation(layout.relationsControl!, fromId, toId)
          }
          onDelete={viewModel.deleteAnnotation}
        />
      )}
    </div>
  )
})

CustomEditor.displayName = "CustomEditor"
