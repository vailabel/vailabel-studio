import {
  FileText,
  ImageIcon,
  Music,
  Table2,
  Video,
  type LucideIcon,
} from "lucide-react"
import type { Item } from "@/shared/types/core"

// Per-item display classification. An Item can be any modality (image, audio,
// video, text document, or a tabular row), so UI that previews items must not
// assume an image. We classify by file extension (or inline `data` for tabular
// rows, which have no file on disk) to pick the right thumbnail/icon.

export type ItemKind = "image" | "audio" | "video" | "tabular" | "text"

const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|bmp|webp|svg|tiff?|avif)$/i
const AUDIO_EXTENSIONS = /\.(wav|mp3|ogg|flac|m4a|aac)$/i
const VIDEO_EXTENSIONS = /\.(mp4|mov|mkv|webm|avi|m4v)$/i
const TABULAR_EXTENSIONS = /\.(csv|tsv|xlsx?|ods)$/i

/** Classify an item into a modality kind for preview/icon purposes. */
export function itemKind(item: Item): ItemKind {
  // Tabular rows carry inline `data` and have no real file path.
  if (item.data && (!item.path || TABULAR_EXTENSIONS.test(item.path))) {
    return "tabular"
  }
  const ref = item.path || item.name || ""
  if (IMAGE_EXTENSIONS.test(ref)) return "image"
  if (AUDIO_EXTENSIONS.test(ref)) return "audio"
  if (VIDEO_EXTENSIONS.test(ref)) return "video"
  if (TABULAR_EXTENSIONS.test(ref)) return "tabular"
  return "text"
}

/** Whether an item can render an actual image thumbnail (vs. a kind icon). */
export function isImageItem(item: Item): boolean {
  return itemKind(item) === "image"
}

const KIND_ICONS: Record<ItemKind, LucideIcon> = {
  image: ImageIcon,
  audio: Music,
  video: Video,
  tabular: Table2,
  text: FileText,
}

/** The Lucide icon to show for an item that has no image thumbnail. */
export function itemKindIcon(item: Item): LucideIcon {
  return KIND_ICONS[itemKind(item)]
}

/** The Lucide icon for a known kind (when the kind is already computed). */
export function iconForKind(kind: ItemKind): LucideIcon {
  return KIND_ICONS[kind]
}
