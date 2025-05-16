import AppRoutes from "./route"
import "./index.css"
import { ThemeProvider } from "./components/theme-provider"
import { DataAccessProvider } from "./contexts/data-access-context"
import { ErrorBoundary } from "./ErrorBoundary"

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <DataAccessProvider>
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
      </DataAccessProvider>
    </ThemeProvider>
  )
}

export default App
