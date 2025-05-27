import AppRoutes from "./route"
import "./index.css"
import { ThemeProvider } from "./components/theme-provider"
import { StorageProvider } from "./contexts/storage-context-provider"
import { ConfirmDialogProvider } from "@/hooks/use-confirm-dialog"
import { useEffect } from "react"
import { SQLiteDBContext } from "@vailabel/core/src/data/sources/sqlite/SQLiteDBContext"
import { useAnnotationsStore } from "./hooks/annotation-store"
import { ErrorBoundary } from "./ErrorBoundary"
import ErrorFallback from "./components/error-fallback"
import { useLabelStore } from "./hooks/use-label-store"
import { useProjectStore } from "./hooks/use-project-store"
import { useImageDataStore } from "./hooks/use-image-data-store"
import { useSettingsStore } from "./hooks/use-settings-store"
import { DevBanner } from "./components/dev-banner"
import { useAIModelStore } from "./hooks/use-ai-model-store"

function App() {
  const { initDBContext: initProjectsContext } = useProjectStore()
  const { initDBContext: initAnnotationsContext } = useAnnotationsStore()
  const { initDBContext: initLabelsContext } = useLabelStore()
  const { initDBContext: initImageDataStore } = useImageDataStore()
  const {
    initDBContext: initSettingsContext,
    getSettings,
    settings,
  } = useSettingsStore()
  const { initDBContext: initAiModelsContext } = useAIModelStore()
  useEffect(() => {
    const db = new SQLiteDBContext()
    initProjectsContext(db)
    initAnnotationsContext(db)
    initLabelsContext(db)
    initImageDataStore(db)
    initSettingsContext(db)
    initAiModelsContext(db)
  }, [
    initProjectsContext,
    initAnnotationsContext,
    initLabelsContext,
    initImageDataStore,
    initSettingsContext,
    initAiModelsContext,
  ])

  useEffect(() => {
    ;(async () => {
      if (settings.length === 0) {
        await getSettings()
      }
    })()
  }, [settings, getSettings])

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <StorageProvider>
        <ConfirmDialogProvider>
          {import.meta.env.DEV && <DevBanner />}
          <ErrorBoundary fallback={<ErrorFallback />}>
            <AppRoutes />
          </ErrorBoundary>
        </ConfirmDialogProvider>
      </StorageProvider>
    </ThemeProvider>
  )
}

export default App
