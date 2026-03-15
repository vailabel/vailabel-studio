import AppRoutes from "./route"
import "./index.css"
import { ThemeProvider } from "./components/theme-provider"
import { StorageProvider } from "./contexts/storage-context-provider"
import { ConfirmDialogProvider } from "@/hooks/use-confirm-dialog"
import { ErrorBoundary } from "./ErrorBoundary"
import ErrorFallback from "./components/error-fallback"

const App = () => {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <StorageProvider>
        <ConfirmDialogProvider>
          <ErrorBoundary fallback={<ErrorFallback />}>
            <AppRoutes />
          </ErrorBoundary>
        </ConfirmDialogProvider>
      </StorageProvider>
    </ThemeProvider>
  )
}

export default App
