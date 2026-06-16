import { Loader2 } from "lucide-react"

/**
 * Suspense fallback shown while a lazily-loaded route chunk downloads. Rendered
 * inside the layout's <Outlet/>, so the sidebar/header chrome stays visible and
 * only the content area shows the spinner.
 */
export const RouteFallback = () => (
  <div className="flex min-h-[40vh] flex-1 items-center justify-center">
    <Loader2 className="size-6 animate-spin text-muted-foreground" />
  </div>
)
