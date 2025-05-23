import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import AWSConfigForm from "@/components/forms/AWSConfigForm"
import AzureConfigForm from "@/components/forms/AzureConfigForm"
import GCPConfigForm from "@/components/forms/GCPConfigForm"

// Define config types for each provider
export type AWSConfig = {
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  region: string
}
export type AzureConfig = {
  accountName: string
  accountKey: string
  container: string
}
export type GCPConfig = {
  serviceAccountJson: string
  bucket: string
}

export type CloudStorageConfig =
  | {
      id: string
      name: string
      provider: "aws"
      config: AWSConfig
      isActive: boolean
    }
  | {
      id: string
      name: string
      provider: "azure"
      config: AzureConfig
      isActive: boolean
    }
  | {
      id: string
      name: string
      provider: "gcp"
      config: GCPConfig
      isActive: boolean
    }

// Base class for all configs
export abstract class CloudStorageConfigBase {
  id: string
  name: string
  provider: "aws" | "azure" | "gcp"
  isActive: boolean
  constructor(
    id: string,
    name: string,
    provider: "aws" | "azure" | "gcp",
    isActive: boolean
  ) {
    this.id = id
    this.name = name
    this.provider = provider
    this.isActive = isActive
  }
  abstract getDisplayName(): string
  abstract validate(): boolean
  abstract save(): Promise<void>
  abstract connect(): Promise<void>
  abstract toJSON(): object
}

export class AWSConfigClass extends CloudStorageConfigBase {
  config: AWSConfig
  constructor(id: string, name: string, config: AWSConfig, isActive: boolean) {
    super(id, name, "aws", isActive)
    this.config = config
  }
  getDisplayName() {
    return `${this.name} (AWS)`
  }
  validate() {
    return !!(
      this.config.accessKeyId &&
      this.config.secretAccessKey &&
      this.config.bucket &&
      this.config.region
    )
  }
  async save() {
    await window.ipc.invoke("command:safeStorage:set", {
      key: `cloudStorageConfig:aws:${this.id}`,
      value: JSON.stringify(this.toJSON()),
    })
  }
  async connect() {
    await this.save()
  }
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      provider: this.provider,
      config: this.config,
      isActive: this.isActive,
    }
  }
  static fromJSON(obj: unknown): AWSConfigClass {
    if (
      typeof obj === "object" &&
      obj !== null &&
      "id" in obj &&
      "name" in obj &&
      "config" in obj &&
      "isActive" in obj
    ) {
      const o = obj as {
        id: string
        name: string
        config: AWSConfig
        isActive: boolean
      }
      return new AWSConfigClass(o.id, o.name, o.config, !!o.isActive)
    }
    throw new Error("Invalid AWSConfigClass JSON")
  }
}

export class AzureConfigClass extends CloudStorageConfigBase {
  config: AzureConfig
  constructor(
    id: string,
    name: string,
    config: AzureConfig,
    isActive: boolean
  ) {
    super(id, name, "azure", isActive)
    this.config = config
  }
  getDisplayName() {
    return `${this.name} (Azure)`
  }
  validate() {
    return !!(
      this.config.accountName &&
      this.config.accountKey &&
      this.config.container
    )
  }
  async save() {
    await window.ipc.invoke("command:safeStorage:set", {
      key: `cloudStorageConfig:azure:${this.id}`,
      value: JSON.stringify(this.toJSON()),
    })
  }
  async connect() {
    await this.save()
  }
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      provider: this.provider,
      config: this.config,
      isActive: this.isActive,
    }
  }
  static fromJSON(obj: unknown): AzureConfigClass {
    if (
      typeof obj === "object" &&
      obj !== null &&
      "id" in obj &&
      "name" in obj &&
      "config" in obj &&
      "isActive" in obj
    ) {
      const o = obj as {
        id: string
        name: string
        config: AzureConfig
        isActive: boolean
      }
      return new AzureConfigClass(o.id, o.name, o.config, !!o.isActive)
    }
    throw new Error("Invalid AzureConfigClass JSON")
  }
}

export class GCPConfigClass extends CloudStorageConfigBase {
  config: GCPConfig
  constructor(id: string, name: string, config: GCPConfig, isActive: boolean) {
    super(id, name, "gcp", isActive)
    this.config = config
  }
  getDisplayName() {
    return `${this.name} (GCP)`
  }
  validate() {
    return !!(this.config.serviceAccountJson && this.config.bucket)
  }
  async save() {
    await window.ipc.invoke("command:safeStorage:set", {
      key: `cloudStorageConfig:gcp:${this.id}`,
      value: JSON.stringify(this.toJSON()),
    })
  }
  async connect() {
    await this.save()
  }
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      provider: this.provider,
      config: this.config,
      isActive: this.isActive,
    }
  }
  static fromJSON(obj: unknown): GCPConfigClass {
    if (
      typeof obj === "object" &&
      obj !== null &&
      "id" in obj &&
      "name" in obj &&
      "config" in obj &&
      "isActive" in obj
    ) {
      const o = obj as {
        id: string
        name: string
        config: GCPConfig
        isActive: boolean
      }
      return new GCPConfigClass(o.id, o.name, o.config, !!o.isActive)
    }
    throw new Error("Invalid GCPConfigClass JSON")
  }
}

// Key for storing the active config id
const ACTIVE_CONFIG_KEY = "cloudStorageActiveConfigId"

// Helper: serialize configs before saving
function serializeConfigs(configs: CloudStorageConfigBase[]): string {
  return JSON.stringify(configs.map((cfg) => cfg.toJSON()))
}

// Helper: deserialize configs after loading
function deserializeConfigs(raw: string): CloudStorageConfigBase[] {
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    // Handle both formats: direct config array or [{account, password}] array
    // If the first item has 'account' and 'password', parse accordingly
    if (arr.length > 0 && "account" in arr[0] && "password" in arr[0]) {
      return arr
        .map((entry: unknown, idx: number) => {
          if (
            typeof entry === "object" &&
            entry !== null &&
            "account" in entry &&
            "password" in entry
          ) {
            try {
              const e = entry as { account: string; password: string }
              const parsed = JSON.parse(e.password)
              const provider = parsed.provider
              const config = parsed.config
              // Fallbacks for id/name
              const id = e.account || `${provider}-${idx}`
              const name = e.account || provider.toUpperCase()
              const isActive = false
              if (provider === "aws")
                return AWSConfigClass.fromJSON({
                  id,
                  name,
                  provider,
                  config,
                  isActive,
                })
              if (provider === "azure")
                return AzureConfigClass.fromJSON({
                  id,
                  name,
                  provider,
                  config,
                  isActive,
                })
              if (provider === "gcp")
                return GCPConfigClass.fromJSON({
                  id,
                  name,
                  provider,
                  config,
                  isActive,
                })
            } catch {
              return null
            }
          }
          return null
        })
        .filter(Boolean) as CloudStorageConfigBase[]
    }
    // Fallback to original logic
    return arr
      .map((cfg: unknown) => {
        if (typeof cfg === "object" && cfg !== null && "provider" in cfg) {
          const provider = (cfg as { provider: string }).provider
          if (provider === "aws") return AWSConfigClass.fromJSON(cfg)
          if (provider === "azure") return AzureConfigClass.fromJSON(cfg)
          if (provider === "gcp") return GCPConfigClass.fromJSON(cfg)
        }
        return null
      })
      .filter(Boolean) as CloudStorageConfigBase[]
  } catch {
    return []
  }
}

const awsSchema = z.object({
  accessKeyId: z.string().min(1, "Required"),
  secretAccessKey: z.string().min(1, "Required"),
  bucket: z.string().min(1, "Required"),
  region: z.string().min(1, "Required"),
})
const azureSchema = z.object({
  accountName: z.string().min(1, "Required"),
  accountKey: z.string().min(1, "Required"),
  container: z.string().min(1, "Required"),
})
const gcpSchema = z.object({
  serviceAccountJson: z.string().min(1, "Required"),
  bucket: z.string().min(1, "Required"),
})

export default function CloudStorageConfigPage() {
  const [configs, setConfigs] = useState<CloudStorageConfigBase[]>([])
  const [editConfig, setEditConfig] = useState<CloudStorageConfigBase | null>(
    null
  )
  const [showForm, setShowForm] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<
    "aws" | "azure" | "gcp"
  >("aws")
  const awsForm = useForm({
    resolver: zodResolver(awsSchema),
    defaultValues: {
      accessKeyId: "",
      secretAccessKey: "",
      bucket: "",
      region: "",
    },
  })
  const azureForm = useForm({
    resolver: zodResolver(azureSchema),
    defaultValues: { accountName: "", accountKey: "", container: "" },
  })
  const gcpForm = useForm({
    resolver: zodResolver(gcpSchema),
    defaultValues: { serviceAccountJson: "", bucket: "" },
  })
  const { toast } = useToast()

  // Load all configs on mount
  useEffect(() => {
    const loadConfigs = async () => {
      try {
        const result = await window.ipc.invoke("query:safeStorage:list", {
          prefix: "cloudStorageConfig",
        })
        let activeId = null
        try {
          activeId = await window.ipc.invoke("query:safeStorage:get", {
            key: ACTIVE_CONFIG_KEY,
          })
        } catch {
          /* ignore if not set */
        }
        let configs = result ? deserializeConfigs(result) : []
        if (activeId) {
          configs = configs.map((cfg) =>
            cfg.id === activeId
              ? cfg.provider === "aws"
                ? new AWSConfigClass(
                    cfg.id,
                    cfg.name,
                    (cfg as AWSConfigClass).config,
                    true
                  )
                : cfg.provider === "azure"
                  ? new AzureConfigClass(
                      cfg.id,
                      cfg.name,
                      (cfg as AzureConfigClass).config,
                      true
                    )
                  : cfg.provider === "gcp"
                    ? new GCPConfigClass(
                        cfg.id,
                        cfg.name,
                        (cfg as GCPConfigClass).config,
                        true
                      )
                    : cfg
              : cfg.provider === "aws"
                ? new AWSConfigClass(
                    cfg.id,
                    cfg.name,
                    (cfg as AWSConfigClass).config,
                    false
                  )
                : cfg.provider === "azure"
                  ? new AzureConfigClass(
                      cfg.id,
                      cfg.name,
                      (cfg as AzureConfigClass).config,
                      false
                    )
                  : cfg.provider === "gcp"
                    ? new GCPConfigClass(
                        cfg.id,
                        cfg.name,
                        (cfg as GCPConfigClass).config,
                        false
                      )
                    : cfg
          )
        }
        setConfigs(configs)
      } catch {
        setConfigs([])
      }
    }
    loadConfigs()
  }, [])

  // Save configs helper
  const saveConfigs = async (
    newConfigs: CloudStorageConfigBase[],
    activeId?: string
  ) => {
    setConfigs(newConfigs)
    await window.ipc.invoke("command:safeStorage:set", {
      key: "cloudStorageConfigs",
      value: serializeConfigs(newConfigs),
    })
    if (activeId) {
      await window.ipc.invoke("command:safeStorage:set", {
        key: ACTIVE_CONFIG_KEY,
        value: activeId,
      })
    }
  }

  // Add new config handler
  const handleAddConfig = () => {
    setEditConfig(null)
    setShowForm(true)
  }

  // Connect handler
  const handleConnect = async (id: string) => {
    const newConfigs = configs.map((cfg) => {
      const isActive = cfg.id === id
      if (cfg.provider === "aws") {
        return new AWSConfigClass(
          cfg.id,
          cfg.name,
          (cfg as AWSConfigClass).config,
          isActive
        )
      } else if (cfg.provider === "azure") {
        return new AzureConfigClass(
          cfg.id,
          cfg.name,
          (cfg as AzureConfigClass).config,
          isActive
        )
      } else if (cfg.provider === "gcp") {
        return new GCPConfigClass(
          cfg.id,
          cfg.name,
          (cfg as GCPConfigClass).config,
          isActive
        )
      }
      return cfg
    })
    await saveConfigs(newConfigs, id)
    toast({
      title: "Connected",
      description: "Config is now active.",
      variant: "default",
    })
  }

  // Delete handler
  const handleDelete = async (id: string) => {
    const newConfigs = configs.filter((cfg) => cfg.id !== id)
    await saveConfigs(newConfigs)
    toast({
      title: "Deleted",
      description: "Config deleted.",
      variant: "destructive",
    })
  }

  // Edit handler
  const handleEdit = (cfg: CloudStorageConfigBase) => {
    setEditConfig(cfg)
    setSelectedProvider(cfg.provider)
    setShowForm(true)
  }

  // Individual submit handlers
  const onSubmitAWS = async (values: {
    accessKeyId: string
    secretAccessKey: string
    bucket: string
    region: string
  }) => {
    const configToSave = { provider: "aws", config: values }
    const key = `cloudStorageConfig:aws`
    await window.ipc.invoke("command:safeStorage:set", {
      key,
      value: JSON.stringify(configToSave),
    })
    toast({
      title: "AWS Configuration saved",
      description: `Your AWS configuration has been saved.`,
      variant: "default",
    })
  }
  const onSubmitAzure = async (values: {
    accountName: string
    accountKey: string
    container: string
  }) => {
    const configToSave = { provider: "azure", config: values }
    const key = `cloudStorageConfig:azure`
    await window.ipc.invoke("command:safeStorage:set", {
      key,
      value: JSON.stringify(configToSave),
    })
    toast({
      title: "Azure Configuration saved",
      description: `Your Azure configuration has been saved.`,
      variant: "default",
    })
  }
  const onSubmitGCP = async (values: {
    serviceAccountJson: string
    bucket: string
  }) => {
    const configToSave = { provider: "gcp", config: values }
    const key = `cloudStorageConfig:gcp`
    await window.ipc.invoke("command:safeStorage:set", {
      key,
      value: JSON.stringify(configToSave),
    })
    toast({
      title: "GCP Configuration saved",
      description: `Your GCP configuration has been saved.`,
      variant: "default",
    })
  }

  // Render config list
  return (
    <div className="max-w-xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">
        Cloud Storage Configuration Manager
      </h1>
      <div className="mb-6">
        <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-blue-900 dark:border-blue-900/30 dark:bg-blue-900/20 dark:text-blue-100">
          <AlertCircle className="mt-0.5 h-10 w-10 text-blue-500" />
          <div>
            <div className="font-semibold">Security Notice</div>
            <div className="text-sm">
              All cloud storage credentials and configuration will be stored
              securely in your system keychain or Electron secure store. Your
              secrets never leave your device.
            </div>
          </div>
        </div>
      </div>
      <div className="mb-4 flex justify-between items-center">
        <div className="text-lg font-semibold">Saved Configurations</div>
        <Button onClick={handleAddConfig}>Add New Config</Button>
      </div>
      {configs.length === 0 ? (
        <div className="text-muted-foreground">No configs saved yet.</div>
      ) : (
        <table className="w-full text-sm border mb-8">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800">
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Provider</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {configs.map((cfg) => (
              <tr
                key={cfg.id}
                className={cfg.isActive ? "bg-blue-50 dark:bg-blue-900/20" : ""}
              >
                <td className="p-2 font-medium">{cfg.name}</td>
                <td className="p-2">{cfg.provider.toUpperCase()}</td>
                <td className="p-2">
                  {cfg.isActive ? (
                    <span className="text-green-600 font-semibold">
                      Connected
                    </span>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="p-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleConnect(cfg.id)}
                    disabled={cfg.isActive}
                  >
                    Connect
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleEdit(cfg)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(cfg.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {/* Config form modal/section will go here */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editConfig ? "Edit Config" : "Add New Config"}
            </DialogTitle>
          </DialogHeader>
          <div className="mb-4">
            <Label className="block mb-2 font-medium">Provider</Label>
            <select
              className="w-full border rounded px-3 py-2 bg-background"
              value={selectedProvider}
              onChange={(e) =>
                setSelectedProvider(e.target.value as "aws" | "azure" | "gcp")
              }
              disabled={!!editConfig}
            >
              <option value="aws">AWS S3</option>
              <option value="azure">Azure Blob Storage</option>
              <option value="gcp">Google Cloud Storage</option>
            </select>
          </div>
          {selectedProvider === "aws" && (
            <form
              onSubmit={awsForm.handleSubmit(onSubmitAWS)}
              className="space-y-6"
            >
              <AWSConfigForm
                control={awsForm.control}
                errors={awsForm.formState.errors}
              />
              <DialogFooter className="flex flex-row gap-2 justify-end">
                <DialogClose asChild>
                  <Button type="button" variant="ghost">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit">
                  {editConfig ? "Save Changes" : "Add AWS Config"}
                </Button>
              </DialogFooter>
              {awsForm.formState.isSubmitSuccessful && (
                <div className="text-green-600 text-center font-medium mt-2">
                  Configuration saved!
                </div>
              )}
            </form>
          )}
          {selectedProvider === "azure" && (
            <form
              onSubmit={azureForm.handleSubmit(onSubmitAzure)}
              className="space-y-6"
            >
              <AzureConfigForm
                control={azureForm.control}
                errors={azureForm.formState.errors}
              />
              <DialogFooter className="flex flex-row gap-2 justify-end">
                <DialogClose asChild>
                  <Button type="button" variant="ghost">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit">
                  {editConfig ? "Save Changes" : "Add Azure Config"}
                </Button>
              </DialogFooter>
              {azureForm.formState.isSubmitSuccessful && (
                <div className="text-green-600 text-center font-medium mt-2">
                  Configuration saved!
                </div>
              )}
            </form>
          )}
          {selectedProvider === "gcp" && (
            <form
              onSubmit={gcpForm.handleSubmit(onSubmitGCP)}
              className="space-y-6"
            >
              <GCPConfigForm
                control={gcpForm.control}
                errors={gcpForm.formState.errors}
              />
              <DialogFooter className="flex flex-row gap-2 justify-end">
                <DialogClose asChild>
                  <Button type="button" variant="ghost">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit">
                  {editConfig ? "Save Changes" : "Add GCP Config"}
                </Button>
              </DialogFooter>
              {gcpForm.formState.isSubmitSuccessful && (
                <div className="text-green-600 text-center font-medium mt-2">
                  Configuration saved!
                </div>
              )}
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
