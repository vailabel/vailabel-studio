import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./app/App"

// Boot-timeline hooks defined inline in index.html (available before this
// module's chunk loads). Optional so a plain web/test build without them is fine.
declare global {
  interface Window {
    __boot?: (msg: string) => void
    __bootDone?: () => void
    removeSplash?: () => void
  }
}

window.__boot?.("rendering app")

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
