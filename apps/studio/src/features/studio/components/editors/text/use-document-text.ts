import { useEffect, useState } from "react"
import { readTextFile } from "@/shared/lib/desktop"

interface LoadState {
  /** The path the loaded content belongs to (for staleness checks). */
  path?: string
  text: string | null
  error: string | null
}

// Load a document's UTF-8 content on demand (referenced in place, not copied).
// State is only set inside the async resolution; "loading" is derived by
// comparing the resolved path with the requested one (no synchronous reset in
// the effect body). Shared by every text task's editor body.
export function useDocumentText(path?: string, id?: string) {
  const [state, setState] = useState<LoadState>({ text: null, error: null })

  useEffect(() => {
    if (!path) return
    let cancelled = false
    readTextFile(path)
      .then((content) => {
        if (cancelled) return
        setState({
          path,
          text: content ?? null,
          error: content == null ? "This document file could not be found." : null,
        })
      })
      .catch((nextError) => {
        if (cancelled) return
        setState({
          path,
          text: null,
          error: nextError instanceof Error ? nextError.message : String(nextError),
        })
      })
    return () => {
      cancelled = true
    }
  }, [path, id])

  // Until the load for the current path resolves, report loading (text == null).
  const loading = state.path !== path
  return {
    text: loading ? null : state.text,
    error: loading ? null : state.error,
  }
}
