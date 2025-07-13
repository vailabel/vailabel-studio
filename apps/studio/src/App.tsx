import AppRoutes from "./route"
import "./index.css"
import { ThemeProvider } from "./components/theme-provider"
import { StorageProvider } from "./contexts/storage-context-provider"
import { ConfirmDialogProvider } from "@/hooks/use-confirm-dialog"
import { useEffect } from "react"
import { ErrorBoundary } from "./ErrorBoundary"
import ErrorFallback from "./components/error-fallback"
import { useProjectStore } from "./stores/use-project-store"
import { ElectronApiDataAdapter } from "./adapters/data/ElectronApiDataAdaptor"
import { useAnnotationsStore } from "./stores/annotation-store"
import { useLabelStore } from "./stores/use-label-store"
import { useImageDataStore } from "./stores/use-image-data-store"
import { useSettingsStore } from "./stores/use-settings-store"
import { useAIModelStore } from "./stores/use-ai-model-store"

const App = () => {
  const { initDataAdapter: initProjectsDataAdapter } = useProjectStore()
  const { initDataAdapter: initAnnotationsDataAdapter } = useAnnotationsStore()
  const { initDataAdapter: initLabelsDataAdapter } = useLabelStore()
  const { initDataAdapter: initImageDataStore } = useImageDataStore()
  const { initDataAdapter: initSettingsDataAdapter } = useSettingsStore()
  const { initDataAdapter: initAiModelsDataAdapter } = useAIModelStore()
  useEffect(() => {
    const data = new ElectronApiDataAdapter()
    initProjectsDataAdapter(data)
    initAnnotationsDataAdapter(data)
    initLabelsDataAdapter(data)
    initImageDataStore(data)
    initSettingsDataAdapter(data)
    initAiModelsDataAdapter(data)
  }, [
    initProjectsDataAdapter,
    initAnnotationsDataAdapter,
    initLabelsDataAdapter,
    initImageDataStore,
    initSettingsDataAdapter,
    initAiModelsDataAdapter,
  ])

  // useEffect(() => {
  //   ;(async () => {
  //     if (settings.length === 0) {
  //       await getSettings()
  //     }
  //   })()
  // }, [settings, getSettings])

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
