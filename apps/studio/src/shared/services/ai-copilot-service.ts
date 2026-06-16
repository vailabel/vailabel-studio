import { studioCommands } from "@/shared/ipc/studio"
import type {
  CopilotApplyAction,
  CopilotTurnRequest,
} from "@/shared/types/ai-assistant"

// Thin wrapper over the copilot IPC surface so the viewmodel never calls Tauri
// commands directly. The copilot brain is fully local (it orchestrates the
// on-device detector and uses a local model — either the one saved in Settings →
// AI Copilot or an auto-discovered one); there is no cloud call.
export const aiCopilotService = {
  turn: (payload: CopilotTurnRequest) => studioCommands.aiCopilotTurn(payload),
  applyAction: (payload: CopilotApplyAction) =>
    studioCommands.aiCopilotApplyAction(payload),
  testConnection: (payload: { baseUrl: string; apiKey?: string }) =>
    studioCommands.aiCopilotTestConnection(payload),
}
