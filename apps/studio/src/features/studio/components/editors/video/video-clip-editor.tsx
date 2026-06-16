import { useCallback, useMemo, useState } from "react"
import { Clapperboard, Cpu, Download, Loader2 } from "lucide-react"
import { Button } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { Progress } from "@/shared/ui/progress"
import { useVideoAnnotationViewModel } from "@/features/studio/model/video-annotation-viewmodel"
import { VideoStage } from "@/features/studio/components/video/video-stage"
import { VideoTimeline } from "@/features/studio/components/video/video-timeline"
import { TrackPanel } from "@/features/studio/components/video/track-panel"
import { CenteredSpinner, ErrorBanner, StatusBadge } from "./video-bits"

// The per-clip track editor, ported from the dedicated page's `Editor`. Runs the
// full FFmpeg ingest pipeline and CVAT-style keyframe tracks via
// `useVideoAnnotationViewModel`; reuses VideoStage/VideoTimeline/TrackPanel.
export const VideoClipEditor = ({
  videoId,
  onBack,
}: {
  videoId: string
  onBack: () => void
}) => {
  const vm = useVideoAnnotationViewModel(videoId)
  const [activeLabelId, setActiveLabelId] = useState<string | null>(null)

  const activeLabel = useMemo(
    () => vm.labels.find((label) => label.id === activeLabelId) ?? null,
    [vm.labels, activeLabelId]
  )

  const onCreateBox = useCallback(
    (shape: { x: number; y: number }[]) => {
      if (!activeLabel) return
      void vm.createTrack(activeLabel, shape)
    },
    [activeLabel, vm]
  )

  if (vm.isLoading) {
    return <CenteredSpinner label="Loading video..." />
  }
  if (!vm.meta) {
    return (
      <div className="p-6">
        <ErrorBanner message="Video not found." />
        <Button variant="outline" onClick={onBack}>
          Back to library
        </Button>
      </div>
    )
  }

  const progressPct = Math.round((vm.job?.progress ?? 0) * 100)
  const needsProcessing = vm.meta.status !== "ready"

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-primary/10">
            <Clapperboard className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-foreground truncate">
              {vm.meta.name}
            </h1>
            <button
              onClick={onBack}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ← back to library
            </button>
          </div>
          <StatusBadge status={vm.meta.status} />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => vm.exportTracks()}
            className="gap-2"
          >
            <Download className="h-4 w-4" /> Export tracks
          </Button>
          <Button
            size="sm"
            onClick={() =>
              vm.runIngest({ sampleFps: 2, sceneThreshold: 0.4, useCuda: true })
            }
            disabled={vm.isIngesting}
            className="gap-2"
          >
            {vm.isIngesting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Cpu className="h-4 w-4" />
            )}
            {vm.isIngesting
              ? "Processing..."
              : needsProcessing
                ? "Process video"
                : "Reprocess"}
          </Button>
        </div>
      </div>

      {vm.isIngesting && vm.job && (
        <Card className="bg-card border-border mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="font-medium text-foreground">{vm.job.stage}</span>
              <span className="text-muted-foreground tabular-nums">
                {progressPct}%
              </span>
            </div>
            <Progress value={progressPct} />
          </CardContent>
        </Card>
      )}
      {vm.error && <ErrorBanner message={vm.error} />}

      {/* Editor body */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 min-w-0 space-y-3">
          <VideoStage
            meta={vm.meta}
            currentFrame={vm.currentFrame}
            visibleShapes={vm.visibleShapes}
            selectedTrackId={vm.selectedTrackId}
            drawColor={activeLabel?.color ?? null}
            onFrameChange={vm.seekFrame}
            onSelectTrack={vm.setSelectedTrackId}
            onCreateBox={onCreateBox}
            onCommitBox={vm.setKeyframe}
          />
          <VideoTimeline
            meta={vm.meta}
            tracks={vm.tracks}
            currentFrame={vm.currentFrame}
            selectedTrackId={vm.selectedTrackId}
            onSeek={vm.seekFrame}
            onSelectTrack={vm.setSelectedTrackId}
          />
        </div>
        <TrackPanel
          labels={vm.labels}
          tracks={vm.tracks}
          selectedTrackId={vm.selectedTrackId}
          currentFrame={vm.currentFrame}
          activeLabelId={activeLabelId}
          onSetActiveLabel={setActiveLabelId}
          onSelectTrack={vm.setSelectedTrackId}
          onDeleteTrack={vm.deleteTrack}
          onRemoveKeyframe={vm.removeKeyframe}
          onToggleOutside={vm.toggleOutside}
          onStepKeyframe={vm.stepKeyframe}
        />
      </div>
    </div>
  )
}
