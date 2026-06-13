const STORAGE_KEY = "vailabel:recent-projects"
const MAX_RECENT = 6

/** Most-recently-opened project ids, newest first. */
export function getRecentProjectIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : []
  } catch {
    return []
  }
}

/** Mark a project as just opened (moves it to the front of the list). */
export function recordRecentProject(projectId: string): void {
  if (!projectId) return
  try {
    const next = [
      projectId,
      ...getRecentProjectIds().filter((id) => id !== projectId),
    ].slice(0, MAX_RECENT)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Ignore storage failures — recents are a convenience, not critical state.
  }
}

/** Drop a project from the recent list (e.g. after deletion). */
export function removeRecentProject(projectId: string): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(getRecentProjectIds().filter((id) => id !== projectId))
    )
  } catch {
    // Ignore.
  }
}
