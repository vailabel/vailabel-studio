import { TrainingMonitor } from "@/shared/components/training/training-monitor"
import { TrainingAgentsSettings } from "./training-agents-settings"

/**
 * Settings → Runtime tab.
 *
 * Runtime status + controls (start/stop/restart/logs) and the model library now
 * live on the AI Assistant page — the single home for the embedded runtime — so
 * this tab keeps the training monitor and the list of training agents (other
 * machines Studio can send training runs to).
 */
export default function RuntimeSettings() {
  return (
    <div className="space-y-6">
      <TrainingMonitor />
      <TrainingAgentsSettings />
    </div>
  )
}
