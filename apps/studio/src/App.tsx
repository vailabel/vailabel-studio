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
import { useTaskStore } from "./stores/use-task-store"
import { FileSystemStorageAdapter } from "./adapters/storage"
import { isElectron } from "./lib/constants"
import { CloudApiDataAdapter } from "./adapters/data/CloudApiDataAdapter"
import { useCanvasStore } from "./stores/canvas-store"
import { useUserStore } from "./stores/use-user-store"

const App = () => {
  const { initDataAdapter: initProjectsDataAdapter } = useProjectStore()
  const { initDataAdapter: initAnnotationsDataAdapter } = useAnnotationsStore()
  const { initDataAdapter: initLabelsDataAdapter } = useLabelStore()
  const { initDataAdapter: initCanvasDataAdapter } = useCanvasStore()
  const {
    initDataAdapter: initImageDataStore,
    initStorageAdapter: initImageStorageAdapter,
  } = useImageDataStore()
  const {
    initDataAdapter: initSettingsDataAdapter,
    getSettings,
    settings,
  } = useSettingsStore()
  const { initDataAdapter: initAiModelsDataAdapter } = useAIModelStore()
  const { initDataAdapter: initTaskDataAdapter } = useTaskStore()
  const { initDataAdapter: initUserDataAdapter } = useUserStore()
  useEffect(() => {
    const data = isElectron()
      ? new ElectronApiDataAdapter()
      : new CloudApiDataAdapter()
    initProjectsDataAdapter(data)
    initAnnotationsDataAdapter(data)
    initLabelsDataAdapter(data)
    initImageDataStore(data)
    initCanvasDataAdapter(data)
    initSettingsDataAdapter(data)
    initAiModelsDataAdapter(data)
    initTaskDataAdapter(data)
    initUserDataAdapter(data)
  }, [
    initProjectsDataAdapter,
    initAnnotationsDataAdapter,
    initLabelsDataAdapter,
    initImageDataStore,
    initSettingsDataAdapter,
    initAiModelsDataAdapter,
    initCanvasDataAdapter,
    initTaskDataAdapter,
    initUserDataAdapter,
  ])

  useEffect(() => {
    const storageAdapter = new FileSystemStorageAdapter("images")
    initImageStorageAdapter(storageAdapter)
  }, [initImageStorageAdapter])

  useEffect(() => {
    if (settings.length === 0) {
      getSettings()
    }
  }, [getSettings, settings.length])

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
