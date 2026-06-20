import { TrainingMonitor } from "@/shared/components/training/training-monitor"

/**
 * Settings → Runtime tab.
 *
 * Runtime status + controls (start/stop/restart/logs) and the model library now
 * live on the AI Assistant page — the single home for the embedded runtime — so
 * this tab keeps only the training monitor.
 */
export default function RuntimeSettings() {
  return (
    <div className="space-y-6">
      <TrainingMonitor />
    </div>
  )
}
