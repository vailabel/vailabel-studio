import AppRoutes from "./route"
import "./index.css"
import { ThemeProvider } from "./components/theme-provider"
import { StorageProvider } from "./contexts/storage-context-provider"
import { ConfirmDialogProvider } from "@/hooks/use-confirm-dialog"
import { CanvasProvider } from "./contexts/canvas-context"
import { AuthProvider } from "./contexts/auth-context"
import { PermissionProvider } from "./contexts/permission-context"
import { ErrorBoundary } from "./ErrorBoundary"
import ErrorFallback from "./components/error-fallback"
import { QueryClientProvider } from "react-query"
import { queryClient } from "./lib/react-query-client"

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <StorageProvider>
          <ConfirmDialogProvider>
            <CanvasProvider>
              <AuthProvider>
                <PermissionProvider>
                  <ErrorBoundary fallback={<ErrorFallback />}>
                    <AppRoutes />
                  </ErrorBoundary>
                </PermissionProvider>
              </AuthProvider>
            </CanvasProvider>
          </ConfirmDialogProvider>
        </StorageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
