import { useEffect } from "react"
import AppRoutes from "./route"
import "./index.css"
import { ThemeProvider } from "./components/layout/theme-provider"
import { ConfirmDialogProvider } from "@/hooks/use-confirm-dialog"
import { ErrorBoundary } from "./ErrorBoundary"
import ErrorFallback from "./components/layout/error-fallback"
import { Toaster } from "@/components/ui/sonner"

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
