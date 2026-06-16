import * as React from "react"
import {
  ChevronLeft,
  ChevronRight,
  Diamond,
  EyeOff,
  Plus,
  Trash2,
} from "lucide-react"
import { Button } from "@/shared/ui/button"
import { Badge } from "@/shared/ui/badge"
import { cn } from "@/shared/lib/utils"
import { isKeyframe } from "@/features/studio/model/lib/video/track-engine"
import type { Label } from "@/shared/types/core"
import type { Track } from "@/shared/types/video"

interface TrackPanelProps {
  labels: Label[]
  tracks: Track[]
  selectedTrackId: string | null
  currentFrame: number
  activeLabelId: string | null
  onSetActiveLabel: (labelId: string | null) => void
  onSelectTrack: (trackId: string) => void
  onDeleteTrack: (trackId: string) => void
  onRemoveKeyframe: (trackId: string) => void
  onToggleOutside: (trackId: string) => void
  onStepKeyframe: (direction: "prev" | "next") => void
}

/**
 * Side panel for keyframe labeling: choose the label to draw with, list/select
 * tracks, and edit the selected track's keyframe at the current frame.
 */
export const TrackPanel: React.FC<TrackPanelProps> = ({
  labels,
  tracks,
  selectedTrackId,
  currentFrame,
  activeLabelId,
  onSetActiveLabel,
  onSelectTrack,
  onDeleteTrack,
  onRemoveKeyframe,
  onToggleOutside,
  onStepKeyframe,
}) => {
  const selected = tracks.find((t) => t.id === selectedTrackId) ?? null
  const hasKeyframeHere = selected ? isKeyframe(selected, currentFrame) : false
  const outsideHere = selected
    ? (selected.keyframes.find((kf) => kf.frame === currentFrame)?.outside ??
      false)
    : false

  return (
    <div className="w-72 shrink-0 space-y-4">
      {/* Draw label */}
      <div className="rounded-lg border border-border bg-card p-3">
        <h3 className="text-sm font-semibold text-foreground mb-2">
          Draw with label
        </h3>
        {labels.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No labels in this project yet. Add labels first.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {labels.map((label) => {
              const active = label.id === activeLabelId
              return (
                <button
                  key={label.id}
                  onClick={() => onSetActiveLabel(active ? null : label.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
                    active
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: label.color }}
                  />
                  {label.name}
                </button>
              )
            })}
          </div>
        )}
        {activeLabelId && (
          <p className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1">
            <Plus className="h-3 w-3" /> Drag on the video to start a new track.
          </p>
        )}
      </div>

      {/* Selected track keyframe controls */}
      {selected && (
        <div className="rounded-lg border border-border bg-card p-3 space-y-3">
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: selected.color }}
            />
            <span className="text-sm font-medium truncate">
              {selected.labelName}
            </span>
            <Badge variant="secondary" className="ml-auto tabular-nums">
              {selected.keyframes.length} kf
            </Badge>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1"
              onClick={() => onStepKeyframe("prev")}
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1"
              onClick={() => onStepKeyframe("next")}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs",
              hasKeyframeHere
                ? "bg-primary/10 text-foreground"
                : "bg-muted/50 text-muted-foreground"
            )}
          >
            <Diamond
              className="h-3.5 w-3.5"
              fill={hasKeyframeHere ? "currentColor" : "none"}
            />
            {hasKeyframeHere
              ? `Keyframe at frame ${currentFrame}`
              : `Interpolated at frame ${currentFrame}`}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant={outsideHere ? "default" : "outline"}
              size="sm"
              className="flex-1 gap-1"
              onClick={() => onToggleOutside(selected.id)}
              title="Mark the object as out of frame here"
            >
              <EyeOff className="h-4 w-4" />
              {outsideHere ? "Outside" : "Mark outside"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasKeyframeHere}
              onClick={() => onRemoveKeyframe(selected.id)}
              title="Remove the keyframe at this frame"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Track list */}
      <div className="rounded-lg border border-border bg-card p-3">
        <h3 className="text-sm font-semibold text-foreground mb-2">
          Tracks
          <Badge variant="secondary" className="ml-2 tabular-nums">
            {tracks.length}
          </Badge>
        </h3>
        {tracks.length === 0 ? (
          <p className="text-xs text-muted-foreground">No tracks yet.</p>
        ) : (
          <div className="space-y-1">
            {tracks.map((track) => (
              <div
                key={track.id}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer",
                  track.id === selectedTrackId
                    ? "bg-primary/10"
                    : "hover:bg-muted/60"
                )}
                onClick={() => onSelectTrack(track.id)}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: track.color }}
                />
                <span className="text-xs flex-1 truncate text-foreground">
                  {track.labelName}
                </span>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {track.keyframes.length} kf
                </span>
                <button
                  className="text-muted-foreground hover:text-destructive"
                  onClick={(event) => {
                    event.stopPropagation()
                    onDeleteTrack(track.id)
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default TrackPanel
