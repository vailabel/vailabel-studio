import { useState } from "react"
import type { ControlTag } from "@/shared/lib/label-config/types"

/** A control's display title: its `title` attr, falling back to its name. */
export function controlTitle(control: ControlTag): string {
  return control.attrs.title || control.name
}

/** Reset a local draft when the source value changes (render-phase, no effect). */
export function useSyncedDraft<T>(value: T): [T, (next: T) => void] {
  const [draft, setDraft] = useState(value)
  const [previous, setPrevious] = useState(value)
  if (previous !== value) {
    setPrevious(value)
    setDraft(value)
  }
  return [draft, setDraft]
}
