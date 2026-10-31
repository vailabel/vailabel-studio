import { useCallback, useEffect, useState } from "react"
import { Annotation, Item, Label, Prediction } from "@/shared/types/core"
import type { AnnotationMeta } from "@/shared/types/modality"
import { services } from "@/shared/services"
import { aiRuntimeService } from "@/shared/services/ai-runtime-service"
import { listenToStudioEvents } from "@/shared/ipc/events"
import type { PipelinePrompt } from "@/shared/ipc/studio"

interface CreateAnnotationDraftInput {
  name: string
  color: string
  type: string
  coordinates: Array<{ x: number; y: number }>
  /** When set, the shape is pre-labeled with this existing class (no modal). */
  labelId?: string
  /** Typed non-spatial payload (text span, audio range, mask RLE, …). */
  meta?: AnnotationMeta
}

/** Result of a smart-segment run, so the UI layer can phrase the right toast. */
export type SmartSegmentOutcome =
  | { status: "ok"; count: number }
  | { status: "no-model" }
  | { status: "error"; message: string }

/** A detector the canvas auto-label dropdown can offer. Sourced from the Python
 *  runtime's model catalog — the runtime fetches its weights on first use. */
export interface DetectorOption {
  id: string
  name: string
}

// Runtime families usable as a plain (prompt-free) box detector for auto-label.
const DETECTOR_FAMILIES = new Set(["rtdetr", "yolo"])

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

export const useItemLabelerViewModel = (
  projectId?: string,
  itemId?: string
) => {
  const [image, setItem] = useState<Item | null>(null)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [aiModels, setAiModels] = useState<DetectorOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGeneratingPredictions, setIsGeneratingPredictions] = useState(false)
  const [isSegmenting, setIsSegmenting] = useState(false)
  const [error, setError] = useState<unknown>(null)

  // `silent` skips the loading-flag flip so an event-driven refresh updates the
  // data in place instead of flashing the whole labeler through a loading state
  // (e.g. after approving a copilot action). The initial mount load is not silent.
  const loadData = useCallback(async (options?: { silent?: boolean }) => {
    if (!itemId) return

    const silent = options?.silent ?? false
    if (!silent) setIsLoading(true)
    setError(null)
    try {
      const nextItem = await services.getItemService().getItem(itemId)
      const effectiveProjectId =
        projectId || nextItem.projectId || nextItem.project_id || ""

      const [nextAnnotations, nextPredictions, nextLabels, nextModels] =
        await Promise.all([
          services.getAnnotationService().getAnnotationsByItemId(itemId),
          services.getPredictionService().listByItemId(itemId),
          effectiveProjectId
            ? services.getLabelService().getLabelsByProjectId(effectiveProjectId)
            : Promise.resolve([]),
          aiRuntimeService.listModels(),
        ])

      setItem(nextItem)
      setAnnotations(nextAnnotations)
      setPredictions(nextPredictions)
      setLabels(nextLabels)
      setAiModels(
        nextModels
          .filter((model) => DETECTOR_FAMILIES.has(model.family))
          .map((model) => ({ id: model.id, name: model.name }))
      )
    } catch (nextError) {
      setError(nextError)
    } finally {
      if (!silent) setIsLoading(false)
    }
  }, [itemId, projectId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    if (!itemId) return

    let unlisten: (() => void) | undefined
    // Coalesce bursts (e.g. an accept emits 2-3 events) into a single refetch so
    // we don't reload N times in a row.
    let reloadTimer: ReturnType<typeof setTimeout> | undefined
    const scheduleReload = () => {
      if (reloadTimer) clearTimeout(reloadTimer)
      reloadTimer = setTimeout(() => {
        // Silent: a save/approve elsewhere shouldn't flash the labeler through
        // its loading state — just reconcile the data in place.
        void loadData({ silent: true })
      }, 150)
    }
    void listenToStudioEvents(
      (event) => {
        const eventImageId = event.itemId || event.item_id
        const eventProjectId = event.projectId || event.project_id
        const activeProjectId =
          projectId || image?.projectId || image?.project_id || ""

        const matchesImage = !eventImageId || eventImageId === itemId
        const matchesProject =
          !eventProjectId || !activeProjectId || eventProjectId === activeProjectId

        if (matchesImage && matchesProject) {
          scheduleReload()
        }
      },
      ["annotations", "predictions", "labels", "items", "ai_models"]
    ).then((cleanup) => {
      unlisten = cleanup
    })

    return () => {
      unlisten?.()
      if (reloadTimer) clearTimeout(reloadTimer)
    }
  }, [image?.projectId, image?.project_id, itemId, loadData, projectId])

  const ensureLabel = useCallback(
    async (name: string, color: string) => {
      const effectiveProjectId =
        projectId || image?.projectId || image?.project_id || ""

      const existingLabel = labels.find(
        (entry) => entry.name.toLowerCase() === name.toLowerCase()
      )
      if (existingLabel) return existingLabel
      if (!effectiveProjectId) return null

      const createdLabel = await services.getLabelService().createLabel({
        name,
        color,
        // Typed by the user in the class picker — not an AI-proposed class.
        isAIGenerated: false,
        projectId: effectiveProjectId,
        project_id: effectiveProjectId,
      })
      setLabels((current) => [createdLabel, ...current])
      return createdLabel
    },
    [image?.projectId, image?.project_id, labels, projectId]
  )

  // ── Class (label) management from inside the labeler ──────────────────────
  // Creating, renaming, recoloring, and deleting classes right where you label,
  // instead of detouring through the project's Classes page.

  const createLabel = useCallback(
    async (input: { name: string; color: string; category?: string }) => {
      const name = input.name.trim()
      if (!name) throw new Error("Class name is required.")
      const existing = labels.find(
        (entry) => entry.name.trim().toLowerCase() === name.toLowerCase()
      )
      if (existing) return existing
      const effectiveProjectId =
        projectId || image?.projectId || image?.project_id || ""
      if (!effectiveProjectId) throw new Error("No project is loaded.")

      const created = await services.getLabelService().createLabel({
        name,
        color: input.color,
        category: input.category?.trim() || undefined,
        isAIGenerated: false,
        projectId: effectiveProjectId,
        project_id: effectiveProjectId,
      })
      setLabels((current) => [...current, created])
      return created
    },
    [image?.projectId, image?.project_id, labels, projectId]
  )

  // Rename / recolor a class. Shapes store their own name + color, so the change
  // is pushed to every shape of this class in the project — otherwise exports
  // and the canvas would keep showing the old name.
  const updateLabel = useCallback(
    async (
      labelId: string,
      updates: Pick<Partial<Label>, "name" | "color" | "category">
    ) => {
      const current = labels.find((entry) => entry.id === labelId)
      if (!current) throw new Error("Class not found.")
      const nextName = updates.name?.trim() ?? current.name
      if (!nextName) throw new Error("Class name is required.")
      const clash = labels.find(
        (entry) =>
          entry.id !== labelId &&
          entry.name.trim().toLowerCase() === nextName.toLowerCase()
      )
      if (clash) throw new Error(`A class named “${clash.name}” already exists.`)

      // Snapshot before saving — compare against this, not the live record.
      const previousName = current.name
      const previousColor = current.color

      // Send the whole record (minus relations): labels_save is a full upsert.
      const {
        annotations: _annotations,
        project: _project,
        ...base
      } = current
      const updated = await services.getLabelService().updateLabel(labelId, {
        ...base,
        ...updates,
        name: nextName,
      })
      setLabels((list) =>
        list.map((entry) => (entry.id === labelId ? updated : entry))
      )

      const nameChanged = updated.name !== previousName
      const colorChanged = updated.color !== previousColor
      if (!nameChanged && !colorChanged) return updated

      const belongs = (annotation: Annotation) => {
        const id = annotation.labelId || annotation.label_id
        return id ? id === labelId : annotation.name === previousName
      }
      const patch = {
        name: updated.name,
        color: updated.color,
        labelId,
        label_id: labelId,
      }
      const effectiveProjectId =
        projectId || image?.projectId || image?.project_id || ""
      const projectAnnotations = effectiveProjectId
        ? await services
            .getAnnotationService()
            .getAnnotationsByProjectId(effectiveProjectId)
        : annotations
      await Promise.all(
        projectAnnotations
          .filter(belongs)
          .map((annotation) =>
            services.getAnnotationService().updateAnnotation(annotation.id, {
              ...annotation,
              ...patch,
            })
          )
      )
      setAnnotations((list) =>
        list.map((annotation) =>
          belongs(annotation) ? { ...annotation, ...patch } : annotation
        )
      )
      return updated
    },
    [annotations, image?.projectId, image?.project_id, labels, projectId]
  )

  // Delete a class. Existing shapes keep their name (they're just detached), so
  // nothing already labeled is lost.
  const deleteLabel = useCallback(async (labelId: string) => {
    await services.getLabelService().deleteLabel(labelId)
    setLabels((list) => list.filter((entry) => entry.id !== labelId))
  }, [])

  const refreshAnnotations = useCallback(async () => {
    await loadData()
  }, [loadData])

  const generatePredictions = useCallback(
    async (modelId: string, threshold?: number) => {
      if (!image) {
        throw new Error("No item selected")
      }

      setIsGeneratingPredictions(true)
      try {
        await waitForNextPaint()
        const nextPredictions = await services.getPredictionService().generate({
          itemId: image.id,
          modelId,
          threshold,
        })

        setPredictions(nextPredictions)
        return nextPredictions
      } finally {
        setIsGeneratingPredictions(false)
      }
    },
    [image]
  )

  // Interactive SAM: resolve the installed SAM model, run the prompt through
  // `pipeline_run`, and surface the returned polygon(s) as predictions for the
  // review loop. Coordinates in `prompt` are already in image space. The
  // backend appends (it doesn't wipe detector boxes), so we merge by id; the
  // `predictions:generated` domain event reconciles the canonical set after.
  const smartSegment = useCallback(
    async (prompt: PipelinePrompt): Promise<SmartSegmentOutcome> => {
      if (!image) return { status: "error", message: "No item is loaded." }

      setIsSegmenting(true)
      try {
        // The runtime's SAM2 is fetched on first use — always available.
        const created = await services.getPredictionService().pipelineRun({
          itemId: image.id,
          modelId: "sam2-base",
          prompt,
        })

        setPredictions((current) => {
          const incoming = new Set(created.map((prediction) => prediction.id))
          return [
            ...created,
            ...current.filter((prediction) => !incoming.has(prediction.id)),
          ]
        })
        return { status: "ok", count: created.length }
      } catch (segmentError) {
        return {
          status: "error",
          message:
            segmentError instanceof Error
              ? segmentError.message
              : String(segmentError),
        }
      } finally {
        setIsSegmenting(false)
      }
    },
    [image]
  )

  // Stable identities: the canvas passes updateAnnotation down to every shape as
  // a prop, so if it were recreated each render the per-shape memo would break and
  // a single edit would re-render the whole canvas. These only touch `services`
  // (a module singleton) and the state setters, so they can be fully stable.
  const createAnnotation = useCallback(
    async (annotation: Omit<Annotation, "id">) => {
      const created = await services.getAnnotationService().createAnnotation(annotation)
      setAnnotations((current) => [created, ...current])
      return created
    },
    []
  )

  const updateAnnotation = useCallback(
    async (annotationId: string, updates: Partial<Annotation>) => {
      const updated = await services
        .getAnnotationService()
        .updateAnnotation(annotationId, updates)
      setAnnotations((current) =>
        current.map((annotation) =>
          annotation.id === annotationId ? updated : annotation
        )
      )
      return updated
    },
    []
  )

  const deleteAnnotation = useCallback(
    async (annotationId: string) => {
      await services.getAnnotationService().deleteAnnotation(annotationId)
      setAnnotations((current) =>
        current.filter((annotation) => annotation.id !== annotationId)
      )
    },
    []
  )

  const createAnnotationFromDraft = useCallback(
    async ({
      name,
      color,
      type,
      coordinates,
      labelId,
      meta,
    }: CreateAnnotationDraftInput) => {
      if (!image) {
        throw new Error("No item is loaded.")
      }

      // Prefer an explicit class (active-class fast path / pre-labeled import)
      // over find-or-create-by-name, so the palette and labels never drift.
      const label =
        (labelId && labels.find((entry) => entry.id === labelId)) ||
        (await ensureLabel(name, color))
      const effectiveProjectId =
        projectId || image.projectId || image.project_id || ""

      const createdAnnotation = await services.getAnnotationService().createAnnotation({
        name: label?.name ?? name,
        type,
        coordinates,
        meta,
        itemId: image.id,
        item_id: image.id,
        projectId: effectiveProjectId,
        project_id: effectiveProjectId,
        labelId: label?.id,
        label_id: label?.id,
        color: label?.color ?? color,
        isAIGenerated: false,
      })

      setAnnotations((current) => [createdAnnotation, ...current])
      return createdAnnotation
    },
    [image, labels, projectId, ensureLabel]
  )

  return {
    image,
    annotations,
    predictions,
    labels,
    aiModels,
    isLoading,
    isGeneratingPredictions,
    isSegmenting,
    error,
    createAnnotationFromDraft,
    createAnnotation,
    createLabel,
    updateLabel,
    deleteLabel,
    updateAnnotation,
    deleteAnnotation,
    generatePredictions,
    smartSegment,
    acceptPrediction: async (predictionId: string, labelId?: string) => {
      const createdAnnotation =
        await services.getPredictionService().accept(predictionId, labelId)
      setPredictions((current) =>
        current.filter((prediction) => prediction.id !== predictionId)
      )
      setAnnotations((current) => [createdAnnotation, ...current])
      // Already updated optimistically above; reconcile quietly so accepting a
      // prediction doesn't flash the labeler through its loading state.
      await loadData({ silent: true })
      return createdAnnotation
    },
    rejectPrediction: async (predictionId: string) => {
      await services.getPredictionService().reject(predictionId)
      setPredictions((current) =>
        current.filter((prediction) => prediction.id !== predictionId)
      )
    },
    // Batch review: accept/reject every current prediction in ONE backend call
    // (one event + one reload) — the per-item loop used to fire ~4N refetches via
    // the domain-event subscription, which made "Accept all" very slow.
    acceptAllPredictions: async () => {
      const ids = predictions.map((prediction) => prediction.id)
      if (ids.length === 0) return 0
      const result = await services.getPredictionService().acceptAll(ids)
      await loadData({ silent: true })
      return result.accepted
    },
    rejectAllPredictions: async () => {
      const ids = predictions.map((prediction) => prediction.id)
      if (ids.length === 0) return 0
      const result = await services.getPredictionService().rejectAll(ids)
      await loadData({ silent: true })
      return result.rejected
    },
    refreshAnnotations,
  }
}

