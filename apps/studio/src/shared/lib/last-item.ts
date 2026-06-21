// Remembers the last item the user was labeling, per project, so reopening the
// studio resumes where they left off instead of jumping to the first file.
// localStorage (per device) is enough — it's a convenience, not synced state.

const key = (projectId: string) => `studio.lastItem.${projectId}`

/** The id of the last item the user had open in this project, or `null`. */
export function getLastItem(projectId?: string): string | null {
  if (!projectId) return null
  try {
    return localStorage.getItem(key(projectId)) || null
  } catch {
    return null
  }
}

/** Remember the item the user is currently labeling in this project. */
export function setLastItem(projectId?: string, itemId?: string): void {
  if (!projectId || !itemId) return
  try {
    localStorage.setItem(key(projectId), itemId)
  } catch {
    // Best-effort: a full/blocked localStorage just means no resume this session.
  }
}
