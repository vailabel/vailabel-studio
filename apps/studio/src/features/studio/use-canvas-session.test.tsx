import { act, renderHook } from "@testing-library/react"
import { useState } from "react"
import type { Annotation } from "@/types/core"
import { useCanvasSession } from "@/features/studio/use-canvas-session"

function createAnnotationFixture(
  overrides: Partial<Annotation> = {}
): Annotation {
  return {
    id: overrides.id || "annotation-1",
    name: overrides.name || "Car",
    type: overrides.type || "box",
    coordinates:
      overrides.coordinates ||
      [
        { x: 5, y: 5 },
        { x: 25, y: 25 },
      ],
    imageId: overrides.imageId || "image-1",
    image_id: overrides.image_id || "image-1",
    projectId: overrides.projectId || "project-1",
    project_id: overrides.project_id || "project-1",
    color: overrides.color || "#22c55e",
    createdAt: overrides.createdAt || new Date("2026-03-15T00:00:00Z"),
    updatedAt: overrides.updatedAt || new Date("2026-03-15T00:00:00Z"),
  }
}

function useCanvasSessionHarness(initialAnnotations: Annotation[] = []) {
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations)
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(
    null
  )

  const createAnnotation = async (annotation: Partial<Annotation>) => {
    const createdAnnotation = createAnnotationFixture({
      ...annotation,
      id: annotation.id || `annotation-${annotations.length + 1}`,
    })
    setAnnotations((current) => [createdAnnotation, ...current])
    return createdAnnotation
  }

  const updateAnnotation = async (
    annotationId: string,
    updates: Partial<Annotation>
  ) => {
    let updatedAnnotation = createAnnotationFixture({ id: annotationId })
    setAnnotations((current) =>
      current.map((annotation) => {
        if (annotation.id !== annotationId) return annotation
        updatedAnnotation = {
          ...annotation,
          ...updates,
          coordinates: updates.coordinates || annotation.coordinates,
        }
        return updatedAnnotation
      })
    )
    return updatedAnnotation
  }

  const deleteAnnotation = async (annotationId: string) => {
    setAnnotations((current) =>
      current.filter((annotation) => annotation.id !== annotationId)
    )
  }

  const session = useCanvasSession({
    annotations,
    selectedAnnotation,
    setSelectedAnnotation,
    createAnnotation,
    createAnnotationFromDraft: async (draft) =>
      createAnnotation({
        id: `draft-${draft.name.toLowerCase()}`,
        name: draft.name,
        type: draft.type,
        color: draft.color,
        coordinates: draft.coordinates,
      }),
    updateAnnotation,
    deleteAnnotation,
  })

  return {
    annotations,
    selectedAnnotation,
    ...session,
  }
}

describe("useCanvasSession", () => {
  it("tracks create operations and supports undo/redo", async () => {
    const { result } = renderHook(() => useCanvasSessionHarness())

    await act(async () => {
      await result.current.createAnnotationFromDraft({
        name: "Bike",
        color: "#2563eb",
        type: "box",
        coordinates: [
          { x: 0, y: 0 },
          { x: 10, y: 10 },
        ],
      })
    })

    expect(result.current.annotations).toHaveLength(1)
    expect(result.current.annotations[0].name).toBe("Bike")
    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(false)

    await act(async () => {
      await result.current.undo()
    })

    expect(result.current.annotations).toHaveLength(0)
    expect(result.current.canRedo).toBe(true)

    await act(async () => {
      await result.current.redo()
    })

    expect(result.current.annotations).toHaveLength(1)
    expect(result.current.annotations[0].name).toBe("Bike")
  })

  it("tracks update and delete operations with reversible history", async () => {
    const initialAnnotation = createAnnotationFixture()
    const { result } = renderHook(() =>
      useCanvasSessionHarness([initialAnnotation])
    )

    await act(async () => {
      await result.current.updateAnnotation(initialAnnotation.id, {
        name: "Truck",
        coordinates: [
          { x: 10, y: 10 },
          { x: 40, y: 40 },
        ],
      })
    })

    expect(result.current.annotations[0].name).toBe("Truck")

    await act(async () => {
      await result.current.undo()
    })

    expect(result.current.annotations[0].name).toBe("Car")
    expect(result.current.annotations[0].coordinates).toEqual(
      initialAnnotation.coordinates
    )

    await act(async () => {
      await result.current.deleteAnnotation(initialAnnotation.id)
    })

    expect(result.current.annotations).toHaveLength(0)
    expect(result.current.canUndo).toBe(true)

    await act(async () => {
      await result.current.undo()
    })

    expect(result.current.annotations).toHaveLength(1)
    expect(result.current.annotations[0].id).toBe(initialAnnotation.id)
  })
})
