import { useEffect } from "react"
import AppRoutes from "./routes"
import "../index.css"
import { ThemeProvider } from "@/shared/ui/theme-provider"
import { ConfirmDialogProvider } from "@/shared/hooks/use-confirm-dialog"
import { ErrorBoundary } from "./error-boundary"
import ErrorFallback from "./layout/error-fallback"
import { Toaster } from "@/shared/ui/sonner"

const App = () => {
  // The shell has mounted — fade out the index.html boot splash and close the
  // boot timeline. Idempotent, so StrictMode's double-mount in dev is harmless.
  useEffect(() => {
    window.__boot?.("app ready")
    window.__bootDone?.()
    window.removeSplash?.()
  }, [])

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <ConfirmDialogProvider>
          <ErrorBoundary fallback={<ErrorFallback />}>
            <AppRoutes />
          </ErrorBoundary>
          <Toaster />
        </ConfirmDialogProvider>
    </ThemeProvider>
  )
}

export default App
