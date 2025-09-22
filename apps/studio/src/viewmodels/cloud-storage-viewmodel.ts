import { useState, useCallback, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { CloudStorageConfig, CloudProvider, AWSConfig, AzureConfig, GCPConfig } from "@/lib/schemas/cloud-storage"

// Storage keys
const CONFIGS_KEY = "cloudStorageConfigs"
const ACTIVE_CONFIG_KEY = "cloudStorageActiveConfigId"

export interface CloudStorageViewModel {
  // State
  configs: CloudStorageConfig[]
  isLoading: boolean
  error: string | null
  
  // Actions
  loadConfigs: () => Promise<void>
  saveConfig: (config: CloudStorageConfig) => Promise<void>
  deleteConfig: (id: string) => Promise<void>
  setActiveConfig: (id: string) => Promise<void>
  testConnection: (config: CloudStorageConfig) => Promise<boolean>
  
  // Computed
  activeConfig: CloudStorageConfig | null
  configsByProvider: Record<CloudProvider, CloudStorageConfig[]>
}

export function useCloudStorageViewModel(): CloudStorageViewModel {
  const [configs, setConfigs] = useState<CloudStorageConfig[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Load configurations from storage
  const loadConfigs = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await window.ipc.invoke("query:safeStorage:list", {
        prefix: "cloudStorageConfig",
      })
      
      let activeId: string | null = null
      try {
        activeId = await window.ipc.invoke("query:safeStorage:get", {
          key: ACTIVE_CONFIG_KEY,
        })
      } catch {
        // Active config not set
      }

      const loadedConfigs = result ? deserializeConfigs(result) : []
      
      // Set active status
      const configsWithActiveStatus = loadedConfigs.map(config => ({
        ...config,
        isActive: config.id === activeId
      }))
      
      setConfigs(configsWithActiveStatus)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load configurations"
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  // Save a configuration
  const saveConfig = useCallback(async (config: CloudStorageConfig) => {
    try {
      await window.ipc.invoke("command:safeStorage:set", {
        key: `cloudStorageConfig:${config.provider}:${config.id}`,
        value: JSON.stringify(config),
      })
      
      // Update local state
      setConfigs(prev => {
        const existing = prev.find(c => c.id === config.id)
        if (existing) {
          return prev.map(c => c.id === config.id ? config : c)
        }
        return [...prev, config]
      })
      
      toast({
        title: "Success",
        description: `${config.provider.toUpperCase()} configuration saved successfully`,
        variant: "default",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save configuration"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    }
  }, [toast])

  // Delete a configuration
  const deleteConfig = useCallback(async (id: string) => {
    try {
      const config = configs.find(c => c.id === id)
      if (!config) return

      await window.ipc.invoke("command:safeStorage:delete", {
        key: `cloudStorageConfig:${config.provider}:${id}`,
      })
      
      // Update local state
      setConfigs(prev => prev.filter(c => c.id !== id))
      
      toast({
        title: "Deleted",
        description: "Configuration deleted successfully",
        variant: "default",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete configuration"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    }
  }, [configs, toast])

  // Set active configuration
  const setActiveConfig = useCallback(async (id: string) => {
    try {
      await window.ipc.invoke("command:safeStorage:set", {
        key: ACTIVE_CONFIG_KEY,
        value: id,
      })
      
      // Update local state
      setConfigs(prev => prev.map(config => ({
        ...config,
        isActive: config.id === id
      })))
      
      const config = configs.find(c => c.id === id)
      toast({
        title: "Connected",
        description: `${config?.provider.toUpperCase()} configuration is now active`,
        variant: "default",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to set active configuration"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    }
  }, [configs, toast])

  // Test connection (placeholder implementation)
  const testConnection = useCallback(async (config: CloudStorageConfig): Promise<boolean> => {
    try {
      // This would typically make an actual API call to test the connection
      // For now, we'll just simulate a test
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Simulate success/failure based on config validation
      const isValid = validateConfig(config)
      
      if (isValid) {
        toast({
          title: "Connection Successful",
          description: `Successfully connected to ${config.provider.toUpperCase()}`,
          variant: "default",
        })
      } else {
        toast({
          title: "Connection Failed",
          description: "Invalid configuration or network error",
          variant: "destructive",
        })
      }
      
      return isValid
    } catch (err) {
      toast({
        title: "Connection Failed",
        description: "Unable to connect to cloud storage",
        variant: "destructive",
      })
      return false
    }
  }, [toast])

  // Computed values
  const activeConfig = configs.find(config => config.isActive) || null
  
  const configsByProvider = configs.reduce((acc, config) => {
    if (!acc[config.provider]) {
      acc[config.provider] = []
    }
    acc[config.provider].push(config)
    return acc
  }, {} as Record<CloudProvider, CloudStorageConfig[]>)

  // Load configs on mount
  useEffect(() => {
    loadConfigs()
  }, [loadConfigs])

  return {
    configs,
    isLoading,
    error,
    loadConfigs,
    saveConfig,
    deleteConfig,
    setActiveConfig,
    testConnection,
    activeConfig,
    configsByProvider,
  }
}

// Helper functions
function deserializeConfigs(raw: string): CloudStorageConfig[] {
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    
    return arr
      .map((cfg: unknown) => {
        if (typeof cfg === "object" && cfg !== null && "provider" in cfg) {
          const provider = (cfg as { provider: string }).provider
          if (provider === "aws") return cfg as CloudStorageConfig
          if (provider === "azure") return cfg as CloudStorageConfig
          if (provider === "gcp") return cfg as CloudStorageConfig
        }
        return null
      })
      .filter(Boolean) as CloudStorageConfig[]
  } catch {
    return []
  }
}

function validateConfig(config: CloudStorageConfig): boolean {
  switch (config.provider) {
    case "aws":
      return !!(config.config.accessKeyId && config.config.secretAccessKey && config.config.bucket && config.config.region)
    case "azure":
      return !!(config.config.accountName && config.config.accountKey && config.config.container)
    case "gcp":
      return !!(config.config.serviceAccountJson && config.config.bucket)
    default:
      return false
  }
}
