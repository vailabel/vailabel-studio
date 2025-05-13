import Route from "./route"
import "./index.css"
import { ThemeProvider } from "./components/theme-provider"
import { DataAccessProvider } from "./contexts/data-access-context"

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <DataAccessProvider>
        <Route />
      </DataAccessProvider>
    </ThemeProvider>
  )
}

export default App
