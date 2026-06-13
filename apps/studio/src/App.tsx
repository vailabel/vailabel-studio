import AppRoutes from "./route"
import "./index.css"
import { ThemeProvider } from "./components/layout/theme-provider"
import { StorageProvider } from "./contexts/storage-context-provider"
import { ConfirmDialogProvider } from "@/hooks/use-confirm-dialog"
import { ErrorBoundary } from "./ErrorBoundary"
import ErrorFallback from "./components/layout/error-fallback"
import { Toaster } from "@/components/ui/sonner"

const App = () => {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <StorageProvider>
        <ConfirmDialogProvider>
          <ErrorBoundary fallback={<ErrorFallback />}>
            <AppRoutes />
          </ErrorBoundary>
          <Toaster />
        </ConfirmDialogProvider>
      </StorageProvider>
    </ThemeProvider>
  )
}

export default App
