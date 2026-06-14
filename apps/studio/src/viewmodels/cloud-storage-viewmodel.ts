import { useEffect, useMemo, useState } from "react"
import { deleteSecret, getSecret, listSecrets, setSecret } from "@/lib/desktop"
import { services } from "@/services"
import type { CloudProvider, CloudTestResult } from "@/ipc/cloud"

export interface CloudStorageConfig {
  id: string
  name: string
  provider: CloudProvider
  /** Non-secret provider fields only (bucket/region/accountName/container). */
  config: Record<string, unknown>
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const CONFIGS_KEY = "cloudStorageConfigs"
const ACTIVE_KEY = "activeCloudStorageConfigId"
const SECRET_NAMESPACE = "cloud-storage"

/**
 * Secret fields per provider. These live ONLY in the OS keychain and are
 * stripped from the config before it is persisted to settings. The field names
 * match the provider forms and what the Rust `build_operator` reads back from
 * the keychain by `<configId>:<field>`.
 */
const secretFieldsByProvider: Record<CloudProvider, string[]> = {
  aws: ["accessKeyId", "secretAccessKey"],
  azure: ["accountKey"],
  gcp: ["serviceAccountJson"],
}

const stripSecrets = (
  provider: CloudProvider,
  config: Record<string, unknown>
): Record<string, unknown> => {
  const secretFields = new Set(secretFieldsByProvider[provider] ?? [])
  return Object.fromEntries(
    Object.entries(config).filter(([key]) => !secretFields.has(key))
  )
}

export const useCloudStorageViewModel = () => {
  const [configs, setConfigs] = useState<CloudStorageConfig[]>([])
  const [activeConfigId, setActiveConfigId] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadConfigs = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [configSetting, activeSetting] = await Promise.all([
        services.getSettingsService().getByKey(CONFIGS_KEY),
        services.getSettingsService().getByKey(ACTIVE_KEY),
      ])
      setConfigs(
        configSetting.value
          ? (JSON.parse(configSetting.value) as CloudStorageConfig[])
          : []
      )
      setActiveConfigId(activeSetting.value || "")
    } catch (nextError) {
      setError(nextError as Error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadConfigs()
  }, [])

  const activeConfig = useMemo(
    () => configs.find((config) => config.id === activeConfigId) || null,
    [configs, activeConfigId]
  )

  const persistConfigs = async (nextConfigs: CloudStorageConfig[]) => {
    setConfigs(nextConfigs)
    await services
      .getSettingsService()
      .update(CONFIGS_KEY, JSON.stringify(nextConfigs))
  }

  /** Write secret fields to the keychain. Empty values are left untouched so
   * editing a config without re-typing secrets does not wipe them. */
  const saveSecrets = async (
    id: string,
    provider: CloudProvider,
    config: Record<string, unknown>
  ) => {
    for (const field of secretFieldsByProvider[provider] ?? []) {
      const value = config[field]
      if (typeof value === "string" && value.length > 0) {
        await setSecret(SECRET_NAMESPACE, `${id}:${field}`, value)
      }
    }
  }

  return {
    configs,
    isLoading,
    error,
    activeConfig,
    saveConfig: async (config: CloudStorageConfig) => {
      // Persist secrets to the keychain, then strip them from the config that
      // goes into plaintext settings storage.
      await saveSecrets(config.id, config.provider, config.config)
      const sanitized: CloudStorageConfig = {
        ...config,
        config: stripSecrets(config.provider, config.config),
        isActive: config.id === activeConfigId,
        updatedAt: new Date().toISOString(),
      }
      const nextConfigs = [
        ...configs.filter((entry) => entry.id !== config.id),
        sanitized,
      ]
      await persistConfigs(nextConfigs)
    },
    deleteConfig: async (configId: string) => {
      const config = configs.find((entry) => entry.id === configId)
      if (config) {
        for (const field of secretFieldsByProvider[config.provider] ?? []) {
          await deleteSecret(SECRET_NAMESPACE, `${config.id}:${field}`)
        }
      }
      await persistConfigs(configs.filter((entry) => entry.id !== configId))
      if (activeConfigId === configId) {
        setActiveConfigId("")
        await services.getSettingsService().update(ACTIVE_KEY, "")
      }
    },
    setActiveConfig: async (configId: string) => {
      setActiveConfigId(configId)
      await services.getSettingsService().update(ACTIVE_KEY, configId)
      await persistConfigs(
        configs.map((config) => ({
          ...config,
          isActive: config.id === configId,
        }))
      )
    },
    /** Rehydrate secret fields from the keychain so an existing config can be
     * edited without forcing the user to re-enter every secret. */
    loadSecrets: async (
      config: CloudStorageConfig
    ): Promise<Record<string, string>> => {
      const fields = secretFieldsByProvider[config.provider] ?? []
      const entries = await Promise.all(
        fields.map(
          async (field) =>
            [
              field,
              (await getSecret(SECRET_NAMESPACE, `${config.id}:${field}`)) ?? "",
            ] as const
        )
      )
      return Object.fromEntries(entries)
    },
    testConnection: async (
      config: CloudStorageConfig
    ): Promise<CloudTestResult> =>
      services.getCloudStorageService().testConnection({
        configId: config.id,
        provider: config.provider,
        config: config.config,
      }),
    listSecretKeys: () => listSecrets(SECRET_NAMESPACE),
  }
}
