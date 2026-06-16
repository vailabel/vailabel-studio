import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

// Per-annotation visibility for the canvas + Regions panel (the Label-Studio
// eye toggle). Kept in its OWN scoped provider — NOT the main CanvasContext —
// so toggling a region's visibility only re-renders the canvas annotation layer
// and the Regions list, never the whole studio tree (canvas render-perf
// invariant). The hidden Set and the stable toggle actions are split into two
// contexts so consumers that only need the actions don't re-render on changes.

const HiddenRegionsContext = createContext<ReadonlySet<string>>(new Set())

interface RegionVisibilityActions {
  toggle: (annotationId: string) => void
  showAll: () => void
}

const RegionVisibilityActionsContext =
  createContext<RegionVisibilityActions | null>(null)

export const RegionVisibilityProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set())

  const toggle = useCallback((annotationId: string) => {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(annotationId)) next.delete(annotationId)
      else next.add(annotationId)
      return next
    })
  }, [])

  const showAll = useCallback(() => setHidden(new Set()), [])

  const actions = useMemo<RegionVisibilityActions>(
    () => ({ toggle, showAll }),
    [toggle, showAll]
  )

  return (
    <HiddenRegionsContext.Provider value={hidden}>
      <RegionVisibilityActionsContext.Provider value={actions}>
        {children}
      </RegionVisibilityActionsContext.Provider>
    </HiddenRegionsContext.Provider>
  )
}

/** The set of currently-hidden annotation ids (re-renders consumers on change). */
export const useHiddenRegions = () => useContext(HiddenRegionsContext)

/** Stable show/hide actions (does not re-render when the hidden set changes). */
export const useRegionVisibilityActions = () => {
  const ctx = useContext(RegionVisibilityActionsContext)
  if (!ctx) {
    throw new Error(
      "useRegionVisibilityActions must be used within a RegionVisibilityProvider"
    )
  }
  return ctx
}
