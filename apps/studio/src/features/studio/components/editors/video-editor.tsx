import { memo, useState } from "react"
import type { EditorProps } from "./types"
import { VideoLibrary } from "./video/video-library"
import { VideoClipEditor } from "./video/video-clip-editor"

// Video modality editor body. Self-contained: it owns clip selection (local
// state, NOT the route's :imageId slot — that slot loads a dataset image, which a
// video clip id is not), and switches between the clip library and the per-clip
// track editor. The generic studio chrome (image file list, class palette, item
// nav) is hidden for video via `capabilities.chrome` (see resolveCapabilities),
// so this body provides the full video experience inside the studio shell.
export const VideoEditor = memo(({ viewModel }: EditorProps) => {
  const projectId = viewModel.effectiveProjectId
  const [videoId, setVideoId] = useState<string | null>(null)

  if (!projectId) {
    return (
      <div className="flex flex-1 items-center justify-center bg-muted">
        <p className="text-muted-foreground">No project selected</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background">
      {videoId ? (
        <VideoClipEditor videoId={videoId} onBack={() => setVideoId(null)} />
      ) : (
        <VideoLibrary projectId={projectId} onOpen={setVideoId} />
      )}
    </div>
  )
})

VideoEditor.displayName = "VideoEditor"
