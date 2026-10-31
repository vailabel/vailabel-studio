import { useCallback } from "react"
import { useResource } from "@/shared/hooks/use-resource"
import { deleteSecret, setSecret } from "@/shared/lib/desktop"
import { services } from "@/shared/services"
import { aiRuntimeService } from "@/shared/services/ai-runtime-service"
import type {
  TrainingAgent,
  TrainingAgentTestRequest,
} from "@/shared/types/training-agent"

// Must match `AGENTS_SETTING_KEY` / `AGENT_SECRET_NAMESPACE` in
// src-tauri/src/features/training/agents.rs — the backend reads both.
const AGENTS_KEY = "trainingAgents"
const SECRET_NAMESPACE = "training-agent"
const tokenKey = (agentId: string) => `${agentId}:token`

const NO_AGENTS: TrainingAgent[] = []

const loadAgents = async (): Promise<TrainingAgent[]> => {
  const setting = await services.getSettingsService().getByKey(AGENTS_KEY)
  return setting?.value ? (JSON.parse(setting.value) as TrainingAgent[]) : []
}

const persist = (agents: TrainingAgent[]) =>
  services.getSettingsService().update(AGENTS_KEY, JSON.stringify(agents))

/**
 * The training agents registered in Studio. Names and addresses are a setting;
 * each agent's access token goes straight to the OS keychain and is never read
 * back into the UI.
 */
export function useTrainingAgents() {
  const {
    data: agents,
    isLoading,
    error,
    mutate,
  } = useResource(loadAgents, {
    initialData: NO_AGENTS,
    invalidateOn: ["settings"],
  })

  /** Add or update an agent. An empty `token` keeps the stored one. */
  const save = useCallback(
    async (agent: TrainingAgent, token: string) => {
      if (token.trim()) {
        await setSecret(SECRET_NAMESPACE, tokenKey(agent.id), token.trim())
      }
      const next = [...agents.filter((entry) => entry.id !== agent.id), agent]
      await persist(next)
      mutate(() => next)
    },
    [agents, mutate]
  )

  const remove = useCallback(
    async (agentId: string) => {
      const next = agents.filter((entry) => entry.id !== agentId)
      await persist(next)
      await deleteSecret(SECRET_NAMESPACE, tokenKey(agentId))
      mutate(() => next)
    },
    [agents, mutate]
  )

  const test = useCallback(
    (request: TrainingAgentTestRequest) =>
      aiRuntimeService.testTrainingAgent(request),
    []
  )

  return { agents, isLoading, error, save, remove, test }
}
