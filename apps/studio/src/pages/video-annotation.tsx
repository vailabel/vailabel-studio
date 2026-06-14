import * as React from "react"
import { memo, useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  AlertTriangle,
  Boxes,
  Clapperboard,
  Cpu,
  Database,
  Download,
  Film,
  Loader2,
  Play,
  Plus,
  Scissors,
  Trash2,
  Upload,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { allowImageDirectory, openPathDialog, toAssetUrl } from "@/lib/desktop"
import { services } from "@/services"
import type { Project } from "@/types/core"
import type { FfmpegInfo, VideoMeta } from "@/types/video"
import { useVideoAnnotationViewModel } from "@/viewmodels/video-annotation-viewmodel"
import { VideoStage } from "@/components/video/video-stage"
import { VideoTimeline } from "@/components/video/video-timeline"
import { TrackPanel } from "@/components/video/track-panel"

const VideoAnnotation = memo(() => {
  const [searchParams, setSearchParams] = useSearchParams()
  const projectId = searchParams.get("projectId") || ""
  const videoId = searchParams.get("videoId") || ""

  if (!projectId) {
    return <ProjectPicker onPick={(id) => setSearchParams({ projectId: id })} />
  }
  if (!videoId) {
    return (
      <VideoLibrary
        projectId={projectId}
        onOpen={(id) => setSearchParams({ projectId, videoId: id })}
        onChangeProject={() => setSearchParams({})}
      />
    )
  }
  return (
    <Editor
      videoId={videoId}
      onBack={() => setSearchParams({ projectId })}
    />
  )
})

VideoAnnotation.displayName = "VideoAnnotation"

export default VideoAnnotation

// ── Project picker ────────────────────────────────────────────────────────────

const ProjectPicker = ({ onPick }: { onPick: (id: string) => void }) => {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    void services
      .getProjectService()
      .list()
      .then(setProjects)
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      <Header
        title="Video Annotation"
        subtitle="Choose a project to import and label video clips"
      />
      {isLoading ? (
        <CenteredSpinner label="Loading projects..." />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={Database}
          title="No projects yet"
          description="Create a project before importing video."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <button key={project.id} onClick={() => onPick(project.id)} className="text-left">
              <Card className="bg-card border-border hover:border-primary/50">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Boxes className="h-5 w-5 text-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {project.name}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {project.description || "No description"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Video library (list + import) ─────────────────────────────────────────────

const VideoLibrary = ({
  projectId,
  onOpen,
  onChangeProject,
}: {
  projectId: string
  onOpen: (id: string) => void
  onChangeProject: () => void
}) => {
  const video = services.getVideoService()
  const [videos, setVideos] = useState<VideoMeta[]>([])
  const [ffmpeg, setFfmpeg] = useState<FfmpegInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const [list, info] = await Promise.all([
        video.list(projectId),
        video.ffmpegInfo(),
      ])
      setVideos(list)
      setFfmpeg(info)
    } catch (nextError) {
      setError(errorMessage(nextError))
    } finally {
      setIsLoading(false)
    }
  }, [video, projectId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const importVideos = useCallback(async () => {
    setError(null)
    try {
      const paths = await openPathDialog({
        multiple: true,
        filters: [
          {
            name: "Video",
            extensions: ["mp4", "mov", "mkv", "webm", "avi", "m4v"],
          },
        ],
      })
      if (!paths.length) return
      setIsImporting(true)
      let lastId = ""
      for (const path of paths) {
        const dir = path.replace(/[\\/][^\\/]+$/, "")
        await allowImageDirectory(dir).catch(() => {})
        const probe = await probeInBrowser(toAssetUrl(path))
        const name = path.split(/[\\/]/).pop() || "video"
        const created = await video.import({ projectId, name, path, ...probe })
        lastId = created.id
      }
      await refresh()
      if (lastId) onOpen(lastId)
    } catch (nextError) {
      setError(errorMessage(nextError))
    } finally {
      setIsImporting(false)
    }
  }, [video, projectId, refresh, onOpen])

  const removeVideo = useCallback(
    async (id: string) => {
      await video.delete(id)
      await refresh()
    },
    [video, refresh]
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <Header
          title="Video Annotation"
          subtitle={
            <button
              onClick={onChangeProject}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              change project
            </button>
          }
        />
        <Button onClick={importVideos} disabled={isImporting} className="gap-2">
          {isImporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Import video
        </Button>
      </div>

      {ffmpeg && <FfmpegBanner info={ffmpeg} />}
      {error && <ErrorBanner message={error} />}

      {isLoading ? (
        <CenteredSpinner label="Loading videos..." />
      ) : videos.length === 0 ? (
        <EmptyState
          icon={Film}
          title="No videos yet"
          description="Import a clip to extract frames, detect scenes, and label objects across time."
          action={
            <Button onClick={importVideos} className="gap-2">
              <Upload className="h-4 w-4" /> Import video
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((item) => (
            <VideoCard
              key={item.id}
              video={item}
              onOpen={() => onOpen(item.id)}
              onDelete={() => removeVideo(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const VideoCard = ({
  video,
  onOpen,
  onDelete,
}: {
  video: VideoMeta
  onOpen: () => void
  onDelete: () => void
}) => (
  <Card className="bg-card border-border overflow-hidden">
    <button onClick={onOpen} className="block w-full text-left">
      <div className="aspect-video bg-muted relative flex items-center justify-center">
        {video.frames[0] ? (
          <img
            src={toAssetUrl(video.frames[0].path)}
            alt={video.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <Clapperboard className="h-8 w-8 text-muted-foreground" />
        )}
        <StatusBadge status={video.status} />
      </div>
    </button>
    <CardContent className="p-3">
      <p className="font-medium text-sm text-foreground truncate">{video.name}</p>
      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="tabular-nums">{formatDuration(video.duration)}</span>
        <span className="flex items-center gap-1">
          <Scissors className="h-3 w-3" />
          {video.sceneCuts.length}
        </span>
        <span className="flex items-center gap-1">
          <Film className="h-3 w-3" />
          {video.frames.length}
        </span>
        <button
          onClick={onDelete}
          className="ml-auto text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </CardContent>
  </Card>
)

// ── Editor ────────────────────────────────────────────────────────────────────

const Editor = ({
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
      <div className="container mx-auto px-4 py-8">
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
    <div className="container mx-auto px-4 py-6">
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

// ── Shared bits ───────────────────────────────────────────────────────────────

const Header = ({
  title,
  subtitle,
}: {
  title: string
  subtitle: React.ReactNode
}) => (
  <div className="flex items-center gap-3">
    <div className="p-2 rounded-lg bg-primary/10">
      <Clapperboard className="h-6 w-6 text-primary" />
    </div>
    <div>
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <div className="text-muted-foreground">{subtitle}</div>
    </div>
  </div>
)

const FfmpegBanner = ({ info }: { info: FfmpegInfo }) => {
  if (info.ffmpeg) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <Cpu className="h-4 w-4" />
        {info.message}
        {info.cuda && (
          <Badge variant="secondary" className="ml-1">
            CUDA
          </Badge>
        )}
      </div>
    )
  }
  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
      <AlertTriangle className="h-4 w-4" />
      {info.message}
    </div>
  )
}

const StatusBadge = ({ status }: { status: VideoMeta["status"] }) => {
  const map: Record<VideoMeta["status"], { label: string; cls: string }> = {
    imported: { label: "Imported", cls: "bg-muted text-foreground" },
    processing: {
      label: "Processing",
      cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
    },
    ready: {
      label: "Ready",
      cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
    },
    failed: { label: "Failed", cls: "bg-destructive/10 text-destructive" },
  }
  const entry = map[status]
  return (
    <span
      className={cn(
        "absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-medium",
        entry.cls
      )}
    >
      {entry.label}
    </span>
  )
}

const ErrorBanner = ({ message }: { message: string }) => (
  <Card className="bg-destructive/10 border-destructive/20 mb-4">
    <CardContent className="p-3 text-sm text-destructive">{message}</CardContent>
  </Card>
)

const CenteredSpinner = ({ label }: { label: string }) => (
  <div className="flex items-center justify-center h-64">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">{label}</p>
    </div>
  </div>
)

const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  action?: React.ReactNode
}) => (
  <div className="text-center py-16">
    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
      <Icon className="h-7 w-7 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
    <p className="text-muted-foreground max-w-md mx-auto mb-5">{description}</p>
    {action}
  </div>
)

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Webview metadata fallback (used only when ffprobe is unavailable). */
const probeInBrowser = (
  src: string
): Promise<{ duration: number; width: number; height: number }> =>
  new Promise((resolve) => {
    const video = document.createElement("video")
    video.preload = "metadata"
    video.muted = true
    video.src = src
    video.onloadedmetadata = () => {
      resolve({
        duration: Number.isFinite(video.duration) ? video.duration : 0,
        width: video.videoWidth,
        height: video.videoHeight,
      })
      video.removeAttribute("src")
      video.load()
    }
    video.onerror = () => resolve({ duration: 0, width: 0, height: 0 })
  })

const formatDuration = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)
