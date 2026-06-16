import { memo, useCallback, useEffect, useMemo } from "react"
import { AlertTriangle, SlidersHorizontal } from "lucide-react"
import { allowImageDirectory, toAssetUrl } from "@/lib/desktop"
import { parseLabelConfig } from "@/lib/label-config/parse"
import {
  resultsForControl,
  resultsFromAnnotations,
  labelsValue,
  relationValue,
} from "@/lib/label-config/result"
import type { ControlTag, LabelConfig } from "@/lib/label-config/types"
import type { Label } from "@/types/core"
import type { EditorProps } from "./types"
import { colorForChoice, isSpatialControl } from "./custom/config-helpers"
import { ObjectImage } from "./custom/object-image"
import { ObjectText } from "./custom/object-text"
import { StandaloneControls } from "./custom/standalone-controls"
import {
  RelationsPanel,
  type RegionInfo,
  type RelationInfo,
} from "./custom/relations-panel"

const FILE_OBJECT_TAGS = new Set(["image", "text", "audio", "hypertext"])

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

  const parsed = useMemo<{ config: LabelConfig | null; error: string | null }>(() => {
    if (!rawConfig) return { config: null, error: null }
    try {
      return { config: parseLabelConfig(rawConfig), error: null }
    } catch (error) {
      return {
        config: null,
        error: error instanceof Error ? error.message : "Invalid labeling config",
      }
    }
  }, [rawConfig])

  // Ensure asset access for media objects (image/audio) on reopen.
  useEffect(() => {
    if (doc?.path) void allowImageDirectory(fileDir(doc.path)).catch(() => {})
  }, [doc?.path])

  // ── result store helpers ───────────────────────────────────────────────────
  const valueFor = useCallback(
    (controlName: string) =>
      resultsFromAnnotations(annotations).find(
        (result) => result.fromName === controlName
      )?.value,
    [annotations]
  )

  const setControlValue = useCallback(
    (control: ControlTag, value: Record<string, unknown>) => {
      const existing = annotations.find(
        (entry) =>
          entry.meta?.kind === "result" && entry.meta.fromName === control.name
      )
      const meta = {
        kind: "result" as const,
        fromName: control.name,
        toName: control.toName,
        resultType: control.tag,
        value,
      }
      if (existing) {
        void viewModel.updateAnnotation(existing.id, { meta })
      } else {
        void viewModel.createAnnotationFromDraft({
          name: control.name,
          color: "#64748b",
          type: control.tag,
          coordinates: [],
          meta,
        })
      }
    },
    [annotations, viewModel]
  )

  const clearControlValue = useCallback(
    (control: ControlTag) => {
      const existing = annotations.find(
        (entry) =>
          entry.meta?.kind === "result" && entry.meta.fromName === control.name
      )
      if (existing) void viewModel.deleteAnnotation(existing.id)
    },
    [annotations, viewModel]
  )

  const addRegion = useCallback(
    (control: ControlTag, value: Record<string, unknown>, color: string) => {
      void viewModel.createAnnotationFromDraft({
        name: control.name,
        color,
        type: control.tag,
        coordinates: [],
        meta: {
          kind: "result",
          fromName: control.name,
          toName: control.toName,
          resultType: control.tag,
          value,
        },
      })
    },
    [viewModel]
  )

  const createRelation = useCallback(
    (control: ControlTag, fromId: string, toId: string) => {
      void viewModel.createAnnotationFromDraft({
        name: control.name,
        color: "#64748b",
        type: "relation",
        coordinates: [],
        meta: {
          kind: "result",
          fromName: control.name,
          toName: control.toName,
          resultType: "relation",
          value: relationValue(fromId, toId),
        },
      })
    },
    [viewModel]
  )

  const createSpan = useCallback(
    (
      control: ControlTag,
      start: number,
      end: number,
      quote: string,
      label: Label
    ) => addRegion(control, labelsValue(start, end, quote, [label.name]), label.color),
    [addRegion]
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
  if (!config || config.objects.length === 0) {
    return (
      <Notice icon="info" title="No labeling config">
        This project has no labeling config. Add one in the project settings.
      </Notice>
    )
  }

  // The interactive viewer = first file object bound to "$data"; literal-value
  // objects (no "$") render as static instruction blocks (lightweight multimodal).
  const primary = config.objects.find(
    (object) => FILE_OBJECT_TAGS.has(object.tag) && object.value.startsWith("$")
  )
  const staticObjects = config.objects.filter(
    (object) => object !== primary && object.value && !object.value.startsWith("$")
  )
  const spatialControlsFor = (objectName: string) =>
    config.controls.filter(
      (control) => isSpatialControl(control) && control.toName === objectName
    )
  const standalone = config.controls.filter(
    (control) => !isSpatialControl(control) && control.tag !== "relations"
  )
  const relationsControl = config.controls.find(
    (control) => control.tag === "relations"
  )

  // Every region (across spatial controls) as a flat list for the relations UI.
  const regionInfos: RegionInfo[] = config.controls
    .filter(isSpatialControl)
    .flatMap((control) =>
      resultsForControl(annotations, control.name).map((result) => {
        const name =
          ((result.value as Record<string, unknown>)[control.tag] as
            | string[]
            | undefined)?.[0] ?? control.name
        return {
          id: result.id,
          label: name,
          color: colorForChoice(control, name),
          control: control.name,
        }
      })
    )
  const relationInfos: RelationInfo[] = resultsFromAnnotations(annotations)
    .filter((result) => result.resultType === "relation")
    .map((result) => {
      const value = result.value as { from_id?: string; to_id?: string }
      return {
        id: result.id,
        fromId: value.from_id ?? "",
        toId: value.to_id ?? "",
      }
    })

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

      {/* Static / instruction objects (literal value, not $field) */}
      {staticObjects.length > 0 && (
        <div className="shrink-0 space-y-2 border-b border-border bg-muted/30 px-6 py-3">
          {staticObjects.map((object) =>
            object.tag === "hypertext" ? (
              <div
                key={object.name}
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: object.value }}
              />
            ) : (
              <p key={object.name} className="text-sm">
                {object.value}
              </p>
            )
          )}
        </div>
      )}

      {/* Primary object viewer */}
      {!primary ? (
        <Notice icon="info" title="No data object">
          Add an object with a <code>$</code> value (e.g. an Image or Text) to
          display the item.
        </Notice>
      ) : primary.tag === "image" ? (
        <ObjectImage
          doc={doc}
          controls={spatialControlsFor(primary.name)}
          resultsByControl={Object.fromEntries(
            spatialControlsFor(primary.name).map((control) => [
              control.name,
              resultsForControl(annotations, control.name),
            ])
          )}
          onCreateRegion={addRegion}
          onDeleteRegion={viewModel.deleteAnnotation}
        />
      ) : primary.tag === "text" ? (
        <ObjectText
          doc={doc}
          control={spatialControlsFor(primary.name)[0]}
          spanResults={resultsForControl(
            annotations,
            spatialControlsFor(primary.name)[0]?.name ?? ""
          )}
          onCreateSpan={createSpan}
          onDeleteRegion={viewModel.deleteAnnotation}
        />
      ) : primary.tag === "audio" ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <audio controls src={toAssetUrl(doc.path)} className="w-full max-w-2xl" />
        </div>
      ) : (
        <Notice icon="info" title="Unsupported object">
          Object “{primary.tag}” isn’t supported yet.
        </Notice>
      )}

      <StandaloneControls
        controls={standalone}
        api={{ valueFor, onSet: setControlValue, onClear: clearControlValue }}
      />

      {relationsControl && (
        <RelationsPanel
          regions={regionInfos}
          relations={relationInfos}
          onLink={(fromId, toId) =>
            createRelation(relationsControl, fromId, toId)
          }
          onDelete={viewModel.deleteAnnotation}
        />
      )}
    </div>
  )
})

CustomEditor.displayName = "CustomEditor"

const Notice = memo(
  ({
    icon,
    title,
    children,
  }: {
    icon: "error" | "info"
    title: string
    children: React.ReactNode
  }) => (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-md rounded-lg border border-border bg-card p-4 text-center">
        <AlertTriangle
          className={
            icon === "error"
              ? "mx-auto mb-2 size-6 text-destructive"
              : "mx-auto mb-2 size-6 text-muted-foreground"
          }
        />
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{children}</p>
      </div>
    </div>
  )
)

Notice.displayName = "Notice"
