import { useEffect, useState } from "react"
import { getSystemInfo, isDesktopApp } from "@/lib/desktop"

export const DevBanner = () => {
  const [time, setTime] = useState(() => new Date())
  const [platform, setPlatform] = useState("")

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!isDesktopApp()) return
    getSystemInfo()
      .then((info) => setPlatform(info.platform))
      .catch(() => setPlatform(""))
  }, [])

  const isDesktopDev = isDesktopApp() && process.env.NODE_ENV === "development"

  return (
    <div className="bg-blue-600 text-white py-2 px-4 text-center font-semibold shadow-md tracking-wide flex flex-col md:flex-row items-center justify-center gap-2">
      <div className="flex items-center gap-2">
        <span className="mr-2">DEV</span> Development Environment
        {isDesktopDev && (
          <span className="ml-2 bg-yellow-500 text-black px-2 py-0.5 rounded text-xs font-bold animate-pulse">
            Desktop Dev Mode {platform && `(${platform})`}
          </span>
        )}
      </div>
      <span className="ml-4 text-sm font-mono bg-black/20 px-2 py-0.5 rounded">
        {time.toLocaleTimeString()}
      </span>
    </div>
  )
}
