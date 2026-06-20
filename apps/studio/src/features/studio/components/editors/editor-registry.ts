import type { ComponentType } from "react"
import type { EditorKind } from "@/features/studio/model/lib/labeling-config"
import { ImageEditor } from "./image-editor"
import { TextEditor } from "./text-editor"
import { AudioEditor } from "./audio-editor"
import { CustomEditor } from "./custom-editor"
import { VideoEditor } from "./video-editor"
import { TableEditor } from "./table-editor"
import type { EditorProps } from "./types"

// Maps a project's resolved editor kind to the editor body the shell mounts.
// Adding a new template/modality is: build one editor + add one line here.
// Image classification reuses the canvas editor (image + a class bar).
export const EDITOR_REGISTRY: Partial<
  Record<EditorKind, ComponentType<EditorProps>>
> = {
  canvas: ImageEditor,
  classification: ImageEditor,
  text: TextEditor,
  audio: AudioEditor,
  custom: CustomEditor,
  video: VideoEditor,
  table: TableEditor,
}

/** The editor body for a kind, falling back to the image editor. */
export function editorFor(kind: EditorKind): ComponentType<EditorProps> {
  return EDITOR_REGISTRY[kind] ?? ImageEditor
}
