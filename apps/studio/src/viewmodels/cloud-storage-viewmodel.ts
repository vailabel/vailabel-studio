import { useEffect, useMemo, useState } from "react"
import {
  deleteSecret,
  getSecret,
  listSecrets,
  setSecret,
} from "@/lib/desktop"
import { services } from "@/services"

export interface CloudStorageConfig {
  id: string
  name: string
  provider: "aws" | "azure" | "gcp"
  config: Record<string, unknown>
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const CONFIGS_KEY = "cloudStorageConfigs"
const ACTIVE_KEY = "activeCloudStorageConfigId"
const SECRET_NAMESPACE = "cloud-storage"

const secretFieldsByProvider: Record<string, string[]> = {
  aws: ["accessKeyId", "secretAccessKey", "sessionToken"],
  azure: ["accountKey", "connectionString", "sasToken"],
  gcp: ["serviceAccountKey", "clientEmail", "privateKey"],
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
        configSetting.value ? (JSON.parse(configSetting.value) as CloudStorageConfig[]) : []
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

  const saveSecrets = async (config: CloudStorageConfig) => {
    const secretFields = secretFieldsByProvider[config.provider] || []
    for (const field of secretFields) {
      const value = config.config[field]
      const secretKey = `${config.id}:${field}`
      if (typeof value === "string" && value.length > 0) {
        await setSecret(SECRET_NAMESPACE, secretKey, value)
      } else {
        await deleteSecret(SECRET_NAMESPACE, secretKey)
      }
    }
  }

  return {
    configs,
    isLoading,
    error,
    activeConfig,
    saveConfig: async (config: CloudStorageConfig) => {
      await saveSecrets(config)
      const nextConfigs = [
        ...configs.filter((entry) => entry.id !== config.id),
        {
          ...config,
          isActive: config.id === activeConfigId,
          updatedAt: new Date().toISOString(),
        },
      ]
      await persistConfigs(nextConfigs)
    },
    deleteConfig: async (configId: string) => {
      const config = configs.find((entry) => entry.id === configId)
      if (config) {
        for (const field of secretFieldsByProvider[config.provider] || []) {
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
        configs.map((config) => ({ ...config, isActive: config.id === configId }))
      )
    },
    testConnection: async (config: CloudStorageConfig) => {
      for (const field of secretFieldsByProvider[config.provider] || []) {
        await getSecret(SECRET_NAMESPACE, `${config.id}:${field}`)
      }
      return true
    },
    listSecretKeys: () => listSecrets(SECRET_NAMESPACE),
  }
}
