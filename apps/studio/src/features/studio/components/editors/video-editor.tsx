import { memo, useCallback, useState } from "react"
import type { EditorProps } from "./types"
import { VideoLibrary } from "./video/video-library"
import { VideoClipEditor } from "./video/video-clip-editor"

const clipKey = (projectId: string) => `video-clip:${projectId}`

// Video modality editor body. Self-contained: it owns clip selection and
// persists it in sessionStorage so navigating away and back restores the last
// open clip. The generic studio chrome (image file list, class palette, item
// nav) is hidden for video via `capabilities.chrome` (see resolveCapabilities),
// so this body provides the full video experience inside the studio shell.
export const VideoEditor = memo(({ viewModel, capabilities }: EditorProps) => {
  const projectId = viewModel.effectiveProjectId
  const [videoId, setVideoId] = useState<string | null>(() =>
    projectId ? sessionStorage.getItem(clipKey(projectId)) : null
  )

  const openClip = useCallback(
    (id: string) => {
      if (projectId) sessionStorage.setItem(clipKey(projectId), id)
      setVideoId(id)
    },
    [projectId]
  )

  const goToLibrary = useCallback(() => {
    if (projectId) sessionStorage.removeItem(clipKey(projectId))
    setVideoId(null)
  }, [projectId])

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
        <VideoClipEditor
          videoId={videoId}
          projectId={projectId}
          task={capabilities.task}
          onBack={goToLibrary}
        />
      ) : (
        <VideoLibrary projectId={projectId} onOpen={openClip} />
      )}
    </div>
  )
})

VideoEditor.displayName = "VideoEditor"
