import AppRoutes from "./route"
import "./index.css"
import { ThemeProvider } from "./components/theme-provider"
import { DataAccessProvider } from "./contexts/data-access-context"
import { ErrorBoundary } from "./ErrorBoundary"
import { StorageProvider } from "./contexts/storage-context-provider"

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <DataAccessProvider>
        <StorageProvider>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </StorageProvider>
      </DataAccessProvider>
    </ThemeProvider>
  )
}

export default App
