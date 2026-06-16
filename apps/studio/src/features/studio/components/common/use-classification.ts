import { useCallback, useMemo } from "react"
import type { Label } from "@/shared/types/core"
import type { StudioScreenViewModel } from "@/features/studio/model/use-studio-screen-viewmodel"

// Whole-item classification shared by every editor. Single-label (image / text
// classification) replaces; multi-label (taxonomy) toggles. One annotation of
// type "classification" per applied class.
export function useClassification(viewModel: StudioScreenViewModel) {
  const classifications = useMemo(
    () =>
      viewModel.data.annotations.filter(
        (entry) => entry.type === "classification"
      ),
    [viewModel.data.annotations]
  )

  const annotation = classifications[0]

  const selectedNames = useMemo(
    () => new Set(classifications.map((entry) => entry.name)),
    [classifications]
  )

  const clear = useCallback(async () => {
    await Promise.all(
      classifications.map((entry) => viewModel.deleteAnnotation(entry.id))
    )
  }, [classifications, viewModel])

  // Single-label: replace any existing class with this one.
  const assign = useCallback(
    async (label: Label) => {
      await clear()
      await viewModel.createAnnotationFromDraft({
        name: label.name,
        color: label.color,
        type: "classification",
        coordinates: [],
      })
    },
    [viewModel, clear]
  )

  // Multi-label: add the class if absent, remove it if already applied.
  const toggle = useCallback(
    async (label: Label) => {
      const existing = classifications.find((entry) => entry.name === label.name)
      if (existing) {
        await viewModel.deleteAnnotation(existing.id)
      } else {
        await viewModel.createAnnotationFromDraft({
          name: label.name,
          color: label.color,
          type: "classification",
          coordinates: [],
        })
      }
    },
    [classifications, viewModel]
  )

  return { annotation, selectedNames, assign, toggle, clear }
}
