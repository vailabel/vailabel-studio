import { useEffect } from "react"
import AppRoutes from "./routes"
import "../index.css"
import { ThemeProvider } from "@/shared/ui/theme-provider"
import { ConfirmDialogProvider } from "@/shared/hooks/use-confirm-dialog"
import { ErrorBoundary } from "./error-boundary"
import ErrorFallback from "./layout/error-fallback"
import { Toaster } from "@/shared/ui/sonner"
import { GpuInstallProvider } from "@/features/ai-models/components/gpu-install-context"
import { GpuInstallIndicator } from "@/features/ai-models/components/gpu-install-indicator"
import { RuntimeInstallProvider } from "@/features/ai-models/components/runtime-install-context"
import { RuntimeInstallIndicator } from "@/features/ai-models/components/runtime-install-indicator"

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
          <GpuInstallProvider>
            <RuntimeInstallProvider>
              <ErrorBoundary fallback={<ErrorFallback />}>
                <AppRoutes />
              </ErrorBoundary>
              <GpuInstallIndicator />
              <RuntimeInstallIndicator />
              <Toaster />
            </RuntimeInstallProvider>
          </GpuInstallProvider>
        </ConfirmDialogProvider>
    </ThemeProvider>
  )
}

export default App
