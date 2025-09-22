import AppRoutes from "./route"
import "./index.css"
import { ThemeProvider } from "./components/theme-provider"
import { StorageProvider } from "./contexts/storage-context-provider"
import { ConfirmDialogProvider } from "@/hooks/use-confirm-dialog"
import { CanvasProvider } from "./contexts/canvas-context"
import { AuthProvider, createAuthService } from "./contexts/auth-context"
import { IAuthService } from "./services/contracts/IAuthService"
import { AuthStorage } from "./services/contracts/IAuthService"
import { useEffect, useState } from "react"
import { ErrorBoundary } from "./ErrorBoundary"
import ErrorFallback from "./components/error-fallback"
import { ElectronApiDataAdapter } from "./adapters/data/ElectronApiDataAdaptor"
import { CloudApiDataAdapter } from "./adapters/data/CloudApiDataAdapter"
import { isElectron } from "./lib/constants"
import { ServiceProvider } from "./services/ServiceProvider"
import { initializeServices, getServices } from "./services/ServiceContainer"

const App = () => {
  const [servicesInitialized, setServicesInitialized] = useState(false)
  const [authService, setAuthService] = useState<IAuthService | null>(null)
  const [authStorage, setAuthStorage] = useState<AuthStorage | null>(null)

  useEffect(() => {
    // Initialize data adapter
    const dataAdapter = isElectron()
      ? new ElectronApiDataAdapter()
      : new CloudApiDataAdapter()
    
    // Initialize services with the data adapter
    initializeServices(dataAdapter)
    setServicesInitialized(true)

    // Initialize auth service
    const { authService: auth, storage } = createAuthService({
      apiBaseUrl: "http://127.0.0.1:8000/api/v1",
      useLocalAuth: isElectron(), // Use local auth in Electron, cloud auth in web
    })
    
    setAuthService(auth)
    setAuthStorage(storage)
  }, [])

  // Don't render until services are initialized
  if (!servicesInitialized || !authService || !authStorage) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Initializing services...</div>
      </div>
    )
  }

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <StorageProvider>
        <ConfirmDialogProvider>
          <CanvasProvider>
            <AuthProvider authService={authService} storage={authStorage}>
              <ServiceProvider services={getServices()}>
                <ErrorBoundary fallback={<ErrorFallback />}>
                  <AppRoutes />
                </ErrorBoundary>
              </ServiceProvider>
            </AuthProvider>
          </CanvasProvider>
        </ConfirmDialogProvider>
      </StorageProvider>
    </ThemeProvider>
  )
}

export default App
