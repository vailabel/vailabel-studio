import { useEffect } from "react"
import { allowImageDirectory, toAssetUrl } from "@/shared/lib/desktop"
import type { Item } from "@/shared/types/core"

const REMOTE_OR_INLINE = /^(https?:|data:|blob:)/i

/**
 * Where a media object's file lives: the item's own file by default, or — for
 * row-based tasks whose columns hold paths/URLs — the value of its field.
 */
export function mediaLocation(doc: Item, valueKey?: string): string {
  const inline = valueKey ? doc.data?.[valueKey] : undefined
  return typeof inline === "string" && inline.trim() ? inline.trim() : doc.path
}

/** A URL the webview can load for a media location (remote, inline or on disk). */
export function mediaUrl(location: string): string {
  return REMOTE_OR_INLINE.test(location) ? location : toAssetUrl(location)
}

/**
 * Resolve a media object to a loadable URL and make sure the asset protocol may
 * read it. Files referenced from a row's column can live anywhere on disk, so
 * each one grants access to its own folder.
 */
export function useMediaUrl(doc: Item, valueKey?: string): string {
  const location = mediaLocation(doc, valueKey)
  useEffect(() => {
    if (!location || REMOTE_OR_INLINE.test(location)) return
    const directory = location.replace(/[\\/][^\\/]*$/, "")
    if (directory) void allowImageDirectory(directory).catch(() => {})
  }, [location])
  return location ? mediaUrl(location) : ""
}
