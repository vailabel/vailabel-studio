import { useCallback, useState } from "react"

/**
 * A tab selection persisted to `localStorage` so it survives the studio screen
 * remounting on item navigation — the screen is keyed by `itemId` (see
 * `studio-page.tsx`), so plain `useState` resets to the default every time the
 * user submits/advances. Restores only a value that is still valid for the
 * current tab set, else the fallback.
 */
export function usePersistentTab(
  storageKey: string,
  allowed: readonly string[],
  fallback: string
): [string, (value: string) => void] {
  const [tab, setTab] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored && allowed.includes(stored)) return stored
    } catch {
      // localStorage unavailable — fall through to the default.
    }
    return fallback
  })

  const select = useCallback(
    (value: string) => {
      setTab(value)
      try {
        localStorage.setItem(storageKey, value)
      } catch {
        // Best-effort: the in-memory selection still applies this session.
      }
    },
    [storageKey]
  )

  return [tab, select]
}
