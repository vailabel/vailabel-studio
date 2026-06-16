import { useCallback } from "react"
import {
  resultsFromAnnotations,
  labelsValue,
  relationValue,
} from "@/shared/lib/label-config/result"
import type { ControlTag } from "@/shared/lib/label-config/types"
import type { Annotation, Label } from "@/shared/types/core"
import type { StudioScreenViewModel } from "@/features/studio/model/use-studio-screen-viewmodel"

/**
 * The result store for the config-driven editor: reads and writes the generic
 * Label Studio-style result envelope (annotation.meta kind "result"). Each
 * control's value lives on a single annotation keyed by `fromName`; regions,
 * relations, and spans are separate annotations. All writes go through the
 * studio view model, so the editor body stays declarative.
 */
export function useConfigResults(
  annotations: Annotation[],
  viewModel: StudioScreenViewModel
) {
  // The current value stored for a single-value control (choices, rating, etc.).
  const valueFor = useCallback(
    (controlName: string) =>
      resultsFromAnnotations(annotations).find(
        (result) => result.fromName === controlName
      )?.value,
    [annotations]
  )

  // Upsert a single-value control: one annotation per control, keyed by fromName.
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

  // Append a region (box/polygon/keypoint/span): one annotation per region.
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
    ) =>
      addRegion(control, labelsValue(start, end, quote, [label.name]), label.color),
    [addRegion]
  )

  return {
    valueFor,
    setControlValue,
    clearControlValue,
    addRegion,
    createRelation,
    createSpan,
  }
}
