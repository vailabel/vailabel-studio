import AppRoutes from "./route"
import "./index.css"
import { ThemeProvider } from "./components/theme-provider"
import { StorageProvider } from "./contexts/storage-context-provider"
import { ConfirmDialogProvider } from "@/hooks/use-confirm-dialog"
import { CanvasProvider } from "./contexts/canvas-context"
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

  useEffect(() => {
    // Initialize data adapter
    const dataAdapter = isElectron()
      ? new ElectronApiDataAdapter()
      : new CloudApiDataAdapter()
    
    // Initialize services with the data adapter
    initializeServices(dataAdapter)
    setServicesInitialized(true)
  }, [])

  // Don't render until services are initialized
  if (!servicesInitialized) {
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
            <ServiceProvider services={getServices()}>
              <ErrorBoundary fallback={<ErrorFallback />}>
                <AppRoutes />
              </ErrorBoundary>
            </ServiceProvider>
          </CanvasProvider>
        </ConfirmDialogProvider>
      </StorageProvider>
    </ThemeProvider>
  )
}

export default App
