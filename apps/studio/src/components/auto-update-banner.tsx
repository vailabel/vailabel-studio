import { Progress } from "@/components/ui/progress"
import { useAutoUpdate } from "@/ipc/useAutoUpdate"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RotateCcw, Download, CheckCircle2, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

export const AutoUpdateBanner = () => {
  const { updateAvailable, progress, updateDownloaded } = useAutoUpdate()

  if (!progress && !updateDownloaded) return null

  const handleRestart = () => {
    // @ts-expect-error electronAPI is injected by preload
    window.electronAPI?.restartApp?.()
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-md z-50 animate-in slide-in-from-bottom-4 duration-300">
      <Card className="border-primary/20 bg-card shadow-lg">
        <CardContent className="p-4 space-y-4">
          {/* Downloading State */}
          {updateAvailable && progress && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-primary animate-pulse" />
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">
                    Update Available
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Downloading version {updateAvailable.version ?? "new version"}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {progress.percent?.toFixed(0)}%
                </Badge>
              </div>
              
              <div className="space-y-2">
                <Progress
                  value={progress.percent}
                  className="h-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="font-mono">
                    {(progress.transferred / 1024 / 1024).toFixed(1)} MB
                  </span>
                  <span className="font-mono">
                    {(progress.total / 1024 / 1024).toFixed(1)} MB
                  </span>
                </div>
              </div>
              
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="text-xs h-7"
                >
                  <a
                    href="https://vailabel.com/updates"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    See what changed
                  </a>
                </Button>
              </div>
            </div>
          )}

          {/* Downloaded State */}
          {updateDownloaded && !progress && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">
                    Update Ready
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Restart the app to install the latest version
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleRestart}
                  className="flex-1"
                  size="sm"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restart & Update
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="text-xs h-8"
                >
                  <a
                    href="https://vailabel.com/updates"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Changelog
                  </a>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
