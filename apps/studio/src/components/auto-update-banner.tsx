import { Progress } from "@/components/ui/progress"
import { useAutoUpdate } from "@/ipc/useAutoUpdate"
import { Button } from "@/components/ui/button"
import { RotateCcw, Download, CheckCircle2 } from "lucide-react"

export function AutoUpdateBanner() {
  const { updateAvailable, progress, updateDownloaded } = useAutoUpdate()

  if (!progress && !updateDownloaded) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-lg z-50 bg-gradient-to-r from-blue-700 to-blue-500 text-white shadow-2xl rounded-xl flex flex-col items-center px-6 py-4 border border-blue-300 animate-in fade-in">
      {updateAvailable && (
        <div className="mb-2 text-base font-semibold flex flex-wrap items-center gap-2">
          <Download className="w-5 h-5 animate-spin-slow" />
          <span>
            Update available:{" "}
            <span className="underline">
              {updateAvailable.version ?? "New version"}
            </span>{" "}
            is being downloaded...
          </span>
          <a
            href="https://vailabel.com/updates"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 underline text-blue-200 hover:text-white transition-colors text-xs font-normal whitespace-nowrap"
          >
            See what changed
          </a>
        </div>
      )}
      {progress && (
        <div className="w-full">
          <Progress
            value={progress.percent}
            className="h-3 rounded-full bg-green-600"
          />
          <div className="text-xs mt-2 text-center text-blue-100">
            Downloading:{" "}
            <span className="font-bold">{progress.percent?.toFixed(1)}%</span> (
            <span className="font-mono">
              {(progress.transferred / 1024 / 1024).toFixed(2)} MB
            </span>{" "}
            /
            <span className="font-mono">
              {(progress.total / 1024 / 1024).toFixed(2)} MB
            </span>
            )
          </div>
          <Button
            onClick={() => {
              // @ts-expect-error electronAPI is injected by preload
              window.electronAPI?.restartApp?.()
            }}
            className="mt-4 w-full bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg shadow"
          >
            <RotateCcw className="w-4 h-4 mr-2 inline-block" />
            Restart & Install Update
          </Button>
        </div>
      )}
      {updateDownloaded && !progress && (
        <>
          <div className="mt-2 font-semibold text-lg text-green-200 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-300" />
            Update downloaded! Restart the app to apply the update.
          </div>
          <Button
            onClick={() => {
              // @ts-expect-error electronAPI is injected by preload
              window.electronAPI?.restartApp?.()
            }}
            className="mt-4 w-full bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg shadow"
          >
            <RotateCcw className="w-4 h-4 mr-2 inline-block" />
            Restart Now
          </Button>
        </>
      )}
    </div>
  )
}
