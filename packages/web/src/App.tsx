import Route from "./route"
import "./index.css"
import { ThemeProvider } from "./components/theme-provider"

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Route />
    </ThemeProvider>
  )
}

export default App
