import { useCallback, useEffect, useState } from "react"
import {
  Clapperboard,
  Film,
  Loader2,
  Scissors,
  Trash2,
  Upload,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { allowImageDirectory, openPathDialog, toAssetUrl } from "@/lib/desktop"
import { services } from "@/services"
import type { FfmpegInfo, VideoMeta } from "@/types/video"
import {
  CenteredSpinner,
  EmptyState,
  ErrorBanner,
  FfmpegBanner,
  StatusBadge,
  errorMessage,
  formatDuration,
  probeInBrowser,
} from "./video-bits"

// The clip library shown by the studio VideoEditor when no clip is open: import,
// list, and delete a project's video clips. Ported from the dedicated page; the
// project is fixed by the studio route, so there's no "change project" affordance.
export const VideoLibrary = ({
  projectId,
  onOpen,
}: {
  projectId: string
  onOpen: (id: string) => void
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
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Clapperboard className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Video clips</h1>
            <p className="text-muted-foreground">
              Import and label video for this project
            </p>
          </div>
        </div>
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
