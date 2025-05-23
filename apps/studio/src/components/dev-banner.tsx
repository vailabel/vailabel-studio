import { useEffect, useState } from "react"
import { isElectron } from "@/lib/constants"

export const DevBanner = () => {
  const [time, setTime] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Detect Electron dev mode
  const isElectronDev = isElectron() && process.env.NODE_ENV === "development"
  const electronVersion = isElectron()
    ? window?.process?.versions?.electron || ""
    : ""
  return (
    <div className="bg-blue-600 text-white py-2 px-4 text-center font-semibold shadow-md tracking-wide flex flex-col md:flex-row items-center justify-center gap-2">
      <div className="flex items-center gap-2">
        <span className="mr-2">🚧</span> Development Environment
        {isElectronDev && (
          <span className="ml-2 bg-yellow-500 text-black px-2 py-0.5 rounded text-xs font-bold animate-pulse">
            Electron Dev Mode {electronVersion && `v${electronVersion}`}
          </span>
        )}
        {isElectron() && (
          <button
            className="ml-3 px-2 py-0.5 rounded bg-black/30 hover:bg-black/50 text-xs font-semibold border border-white/20 transition-colors"
            onClick={() => {
              // Open Electron dev tools
              window.ipc?.invoke?.("command:openDevTools")
            }}
            title="Open Electron DevTools"
          >
            Open DevTools
          </button>
        )}
      </div>
      <span className="ml-4 text-sm font-mono bg-black/20 px-2 py-0.5 rounded">
        {time.toLocaleTimeString()}
      </span>
    </div>
  )
}
