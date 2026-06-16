import * as React from "react"
import { AlertTriangle, Cpu, Loader2 } from "lucide-react"
import { Badge } from "@/shared/ui/badge"
import { Card, CardContent } from "@/shared/ui/card"
import { cn } from "@/shared/lib/utils"
import type { FfmpegInfo, VideoMeta } from "@/shared/types/video"

// Shared presentational bits + helpers for the studio video editor, ported
// verbatim from the former dedicated `/video-annotation` page so the in-studio
// editor looks and behaves identically.

export const StatusBadge = ({ status }: { status: VideoMeta["status"] }) => {
  const map: Record<VideoMeta["status"], { label: string; cls: string }> = {
    imported: { label: "Imported", cls: "bg-muted text-foreground" },
    processing: {
      label: "Processing",
      cls: "bg-info/15 text-info",
    },
    ready: {
      label: "Ready",
      cls: "bg-success/15 text-success",
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

export const FfmpegBanner = ({ info }: { info: FfmpegInfo }) => {
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
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
      <AlertTriangle className="h-4 w-4" />
      {info.message}
    </div>
  )
}

export const ErrorBanner = ({ message }: { message: string }) => (
  <Card className="bg-destructive/10 border-destructive/20 mb-4">
    <CardContent className="p-3 text-sm text-destructive">{message}</CardContent>
  </Card>
)

export const CenteredSpinner = ({ label }: { label: string }) => (
  <div className="flex items-center justify-center h-64">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">{label}</p>
    </div>
  </div>
)

export const EmptyState = ({
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

/** Webview metadata fallback (used only when ffprobe is unavailable). */
export const probeInBrowser = (
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

export const formatDuration = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)
