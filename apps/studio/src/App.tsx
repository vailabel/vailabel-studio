import AppRoutes from "./route"
import "./index.css"
import { ThemeProvider } from "./components/theme-provider"
import { ErrorBoundary } from "./ErrorBoundary"
import { StorageProvider } from "./contexts/storage-context-provider"
import { ConfirmDialogProvider } from "@/hooks/use-confirm-dialog"
import { useProjectsStore } from "./hooks/use-store"
import { useEffect } from "react"
import { SQLiteDBContext } from "@vailabel/core/src/data/sources/sqlite/SQLiteDBContext"
import { useAnnotationsStore } from "./hooks/annotation-store"

function App() {
  const { initDBContext: initProjectsContext } = useProjectsStore()
  const { initDBContext: initAnnotationsContext } = useAnnotationsStore()
  useEffect(() => {
    initProjectsContext(new SQLiteDBContext())
    initAnnotationsContext(new SQLiteDBContext())
  }, [initProjectsContext, initAnnotationsContext])
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <StorageProvider>
        <ErrorBoundary>
          <ConfirmDialogProvider>
            <AppRoutes />
          </ConfirmDialogProvider>
        </ErrorBoundary>
      </StorageProvider>
    </ThemeProvider>
  )
}

export default App
