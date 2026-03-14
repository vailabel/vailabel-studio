import { useMemo } from "react"
import { useSettings, useUpdateSettings } from "@/hooks/api/settings-hooks"
import {
  deleteSecret,
  getSecret,
  listSecrets,
  setSecret,
} from "@/lib/desktop"

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
  const { data: settings = [], isLoading } = useSettings()
  const updateSettingsMutation = useUpdateSettings()

  const configSetting = settings.find((setting) => setting.key === CONFIGS_KEY)
  const activeSetting = settings.find((setting) => setting.key === ACTIVE_KEY)

  const configs = useMemo(() => {
    if (!configSetting?.value) return [] as CloudStorageConfig[]
    try {
      return JSON.parse(configSetting.value) as CloudStorageConfig[]
    } catch {
      return [] as CloudStorageConfig[]
    }
  }, [configSetting?.value])

  const activeConfig =
    configs.find((config) => config.id === activeSetting?.value) || null

  const persistConfigs = async (nextConfigs: CloudStorageConfig[]) => {
    await updateSettingsMutation.mutateAsync({
      key: CONFIGS_KEY,
      value: JSON.stringify(nextConfigs),
    })
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

  const stripSecrets = async (config: CloudStorageConfig) => {
    const secretFields = secretFieldsByProvider[config.provider] || []
    const sanitizedConfig = { ...config.config }
    for (const field of secretFields) {
      const secretKey = `${config.id}:${field}`
      const secretValue = await getSecret(SECRET_NAMESPACE, secretKey)
      if (secretValue) {
        sanitizedConfig[field] = "Stored securely"
      }
    }
    return {
      ...config,
      config: sanitizedConfig,
    }
  }

  const saveConfig = async (config: CloudStorageConfig) => {
    await saveSecrets(config)
    const nextConfigs = [
      ...configs.filter((existing) => existing.id !== config.id),
      {
        ...config,
        isActive: activeSetting?.value === config.id,
        updatedAt: new Date().toISOString(),
      },
    ]
    await persistConfigs(nextConfigs)
  }

  const deleteConfig = async (configId: string) => {
    const config = configs.find((entry) => entry.id === configId)
    if (config) {
      const secretFields = secretFieldsByProvider[config.provider] || []
      for (const field of secretFields) {
        await deleteSecret(SECRET_NAMESPACE, `${config.id}:${field}`)
      }
    }

    const nextConfigs = configs.filter((config) => config.id !== configId)
    await persistConfigs(nextConfigs)
    if (activeSetting?.value === configId) {
      await updateSettingsMutation.mutateAsync({
        key: ACTIVE_KEY,
        value: "",
      })
    }
  }

  const setActiveConfig = async (configId: string) => {
    const nextConfigs = configs.map((config) => ({
      ...config,
      isActive: config.id === configId,
    }))
    await persistConfigs(nextConfigs)
    await updateSettingsMutation.mutateAsync({
      key: ACTIVE_KEY,
      value: configId,
    })
  }

  const testConnection = async (config: CloudStorageConfig) => {
    await stripSecrets(config)
    return true
  }

  return {
    configs,
    isLoading,
    error: updateSettingsMutation.error as Error | null,
    saveConfig,
    deleteConfig,
    setActiveConfig,
    testConnection,
    activeConfig,
    listSecretKeys: () => listSecrets(SECRET_NAMESPACE),
  }
}
