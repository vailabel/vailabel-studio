import { studioCommands } from "@/ipc/studio"
import type {
  CopilotApplyAction,
  CopilotTurnRequest,
} from "@/types/ai-assistant"

// Thin wrapper over the copilot IPC surface so the viewmodel never calls Tauri
// commands directly. The copilot brain is fully local (it orchestrates the
// on-device detector and auto-discovers a local model); there is no cloud call.
export const aiCopilotService = {
  turn: (payload: CopilotTurnRequest) => studioCommands.aiCopilotTurn(payload),
  applyAction: (payload: CopilotApplyAction) =>
    studioCommands.aiCopilotApplyAction(payload),
}
