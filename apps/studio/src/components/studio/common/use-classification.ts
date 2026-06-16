import { useCallback, useMemo } from "react"
import type { Label } from "@/types/core"
import type { StudioScreenViewModel } from "@/features/studio/use-studio-screen-viewmodel"

// Whole-item, single-label classification shared by every editor (image or text).
// One annotation of type "classification" per item; assigning replaces it.
export function useClassification(viewModel: StudioScreenViewModel) {
  const annotation = useMemo(
    () =>
      viewModel.data.annotations.find(
        (entry) => entry.type === "classification"
      ),
    [viewModel.data.annotations]
  )

  const clear = useCallback(async () => {
    const existing = viewModel.data.annotations.filter(
      (entry) => entry.type === "classification"
    )
    await Promise.all(
      existing.map((entry) => viewModel.deleteAnnotation(entry.id))
    )
  }, [viewModel])

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

  return { annotation, assign, clear }
}
