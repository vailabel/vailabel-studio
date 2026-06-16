import { useCallback, useMemo, useState } from "react"
import { annotationsToSegments, normalizeRange } from "@/features/studio/model/lib/audio-segments"
import type { Label } from "@/shared/types/core"
import type { StudioScreenViewModel } from "@/features/studio/model/use-studio-screen-viewmodel"

interface PendingRange {
  tStart: number
  tEnd: number
  x: number
  y: number
}

interface AudioSegmentsOptions {
  docId: string | undefined
  duration: number
  /** transcription tasks store an editable transcript per segment. */
  withTranscript: boolean
}

/**
 * Owns the audio editor's segment annotations: the derived segment list, the
 * pending range awaiting a class label (for the floating menu), and the create /
 * transcript handlers. A waveform drag either creates a transcript segment
 * directly or opens the label menu via `pending`.
 */
export function useAudioSegments(
  viewModel: StudioScreenViewModel,
  { docId, duration, withTranscript }: AudioSegmentsOptions
) {
  const { annotations } = viewModel.data
  const [pending, setPending] = useState<PendingRange | null>(null)

  // Drop any half-finished selection when switching clips — adjusted during
  // render (not in an effect) so the stale pending menu never paints.
  const [clipId, setClipId] = useState(docId)
  if (docId !== clipId) {
    setClipId(docId)
    setPending(null)
  }

  const segments = useMemo(
    () => annotationsToSegments(annotations),
    [annotations]
  )

  const createSegment = useCallback(
    (label: Label | null, tStart: number, tEnd: number) => {
      void viewModel.createAnnotationFromDraft({
        name: label?.name ?? "segment",
        color: label?.color ?? "#64748b",
        type: "segment",
        coordinates: [],
        labelId: label?.id,
        meta: {
          kind: "audio",
          tStart,
          tEnd,
          ...(withTranscript ? { text: "" } : {}),
        },
      })
    },
    [viewModel, withTranscript]
  )

  const onSelectRange = useCallback(
    (a: number, b: number, x: number, y: number) => {
      const range = normalizeRange(a, b, duration)
      if (!range) return
      if (withTranscript) {
        createSegment(null, range.tStart, range.tEnd)
      } else {
        setPending({ ...range, x, y })
      }
    },
    [duration, withTranscript, createSegment]
  )

  const onTranscript = useCallback(
    (id: string, text: string) => {
      const annotation = annotations.find((entry) => entry.id === id)
      if (annotation?.meta?.kind !== "audio") return
      void viewModel.updateAnnotation(id, {
        meta: { ...annotation.meta, text },
      })
    },
    [annotations, viewModel]
  )

  const confirmPending = useCallback(
    (label: Label) => {
      if (!pending) return
      createSegment(label, pending.tStart, pending.tEnd)
      setPending(null)
    },
    [pending, createSegment]
  )

  return {
    segments,
    pending,
    onSelectRange,
    onTranscript,
    confirmPending,
    dismissPending: useCallback(() => setPending(null), []),
  }
}
