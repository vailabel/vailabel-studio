import { useCallback, useEffect, useState } from "react"
import { deleteSecret, getSecret, setSecret } from "@/lib/desktop"
import { services } from "@/services"
import { aiCopilotService } from "@/services/ai-copilot-service"
import type { CopilotConfig, CopilotTestResult } from "@/types/ai-assistant"

/** Keychain namespace/field for the optional server API key — kept out of the
 *  plaintext settings store, matching the cloud-storage pattern. */
const SECRET_NAMESPACE = "copilot"
const API_KEY_FIELD = "apiKey"

/** Plain `copilot.*` settings keys the backend reads in `resolve_llm`. */
const SETTING_KEYS = {
  provider: "copilot.provider",
  baseUrl: "copilot.baseUrl",
  model: "copilot.model",
  vision: "copilot.vision",
} as const

export const DEFAULT_COPILOT_CONFIG: CopilotConfig = {
  provider: "auto",
  baseUrl: "",
  model: "",
  vision: "auto",
}

/**
 * Loads and persists the AI Copilot's local LLM/VLM server config. The
 * non-secret fields live in the generic settings store (`copilot.*`); the API
 * key lives only in the OS keychain. An empty `baseUrl` means "auto-detect",
 * which is what the backend falls back to when nothing is configured.
 */
export function useCopilotSettings() {
  const [config, setConfig] = useState<CopilotConfig>(DEFAULT_COPILOT_CONFIG)
  const [hasStoredKey, setHasStoredKey] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const settings = services.getSettingsService()
      const [provider, baseUrl, model, vision] = await Promise.all([
        settings.getByKey(SETTING_KEYS.provider),
        settings.getByKey(SETTING_KEYS.baseUrl),
        settings.getByKey(SETTING_KEYS.model),
        settings.getByKey(SETTING_KEYS.vision),
      ])
      const visionValue = vision.value
      setConfig({
        provider: provider.value || "auto",
        baseUrl: baseUrl.value || "",
        model: model.value || "",
        vision:
          visionValue === "on" || visionValue === "off" ? visionValue : "auto",
      })
      setHasStoredKey(Boolean(await getSecret(SECRET_NAMESPACE, API_KEY_FIELD)))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  /**
   * Persist the config. `apiKey` semantics, mirroring cloud-storage secrets:
   *  - a non-empty string is written to the keychain;
   *  - `null` clears the stored key;
   *  - `undefined` (or "") leaves the stored key untouched.
   */
  const save = useCallback(
    async (next: CopilotConfig, apiKey?: string | null) => {
      setIsSaving(true)
      try {
        const settings = services.getSettingsService()
        const sanitized: CopilotConfig = {
          provider: next.provider,
          baseUrl: next.baseUrl.trim(),
          model: next.model.trim(),
          vision: next.vision,
        }
        await Promise.all([
          settings.update(SETTING_KEYS.provider, sanitized.provider),
          settings.update(SETTING_KEYS.baseUrl, sanitized.baseUrl),
          settings.update(SETTING_KEYS.model, sanitized.model),
          settings.update(SETTING_KEYS.vision, sanitized.vision),
        ])
        if (apiKey === null) {
          await deleteSecret(SECRET_NAMESPACE, API_KEY_FIELD)
          setHasStoredKey(false)
        } else if (apiKey && apiKey.length > 0) {
          await setSecret(SECRET_NAMESPACE, API_KEY_FIELD, apiKey)
          setHasStoredKey(true)
        }
        setConfig(sanitized)
      } finally {
        setIsSaving(false)
      }
    },
    []
  )

  const testConnection = useCallback(
    (baseUrl: string, typedKey?: string): Promise<CopilotTestResult> =>
      aiCopilotService.testConnection({
        baseUrl,
        apiKey: typedKey && typedKey.length > 0 ? typedKey : undefined,
      }),
    []
  )

  return {
    config,
    hasStoredKey,
    isLoading,
    isSaving,
    reload: load,
    save,
    testConnection,
  }
}
