import { useState } from "react"
import { z } from "zod"
import { toast } from "sonner"
import {
  Cloud,
  Plus,
  Trash2,
  Play,
  Pencil,
  CheckCircle,
  XCircle,
  Shield,
  Eye,
  EyeOff,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Textarea } from "@/shared/ui/textarea"
import { Label } from "@/shared/ui/label"
import { Badge } from "@/shared/ui/badge"
import { Alert, AlertDescription } from "@/shared/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table"
import { SettingsSection } from "@/features/settings/components/settings-ui"
import { useConfirmDialog } from "@/shared/hooks/use-confirm-dialog"
import {
  useCloudStorageViewModel,
  type CloudStorageConfig,
} from "@/shared/model/cloud-storage-viewmodel"
import {
  awsConfigSchema,
  azureConfigSchema,
  gcpConfigSchema,
  type CloudProvider,
} from "@/features/settings/model/schemas/cloud-storage"

type FieldDef = {
  key: string
  label: string
  placeholder: string
  help?: string
  secret?: boolean
  multiline?: boolean
}

type ProviderDef = {
  id: CloudProvider
  name: string
  schema: z.ZodTypeAny
  fields: FieldDef[]
}

/** Provider field definitions drive the inline form, so all three providers
 *  share one rendering path instead of three near-duplicate form components. */
const PROVIDERS: ProviderDef[] = [
  {
    id: "aws",
    name: "AWS S3",
    schema: awsConfigSchema,
    fields: [
      {
        key: "accessKeyId",
        label: "Access Key ID",
        placeholder: "AKIA...",
        help: "Your AWS IAM user's access key ID.",
      },
      {
        key: "secretAccessKey",
        label: "Secret Access Key",
        placeholder: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYzEXAMPLEKEY",
        help: "Stored encrypted in your system keychain.",
        secret: true,
      },
      {
        key: "bucket",
        label: "Bucket Name",
        placeholder: "my-annotation-bucket",
        help: "The S3 bucket where images are stored.",
      },
      {
        key: "region",
        label: "Region",
        placeholder: "us-west-2",
        help: "e.g. us-east-1, eu-west-1.",
      },
    ],
  },
  {
    id: "azure",
    name: "Azure Blob Storage",
    schema: azureConfigSchema,
    fields: [
      {
        key: "accountName",
        label: "Account Name",
        placeholder: "mystorageaccount",
        help: "3–24 lowercase letters and numbers.",
      },
      {
        key: "accountKey",
        label: "Account Key",
        placeholder: "Base64-encoded account key",
        help: "Stored encrypted in your system keychain.",
        secret: true,
      },
      {
        key: "container",
        label: "Container Name",
        placeholder: "my-container",
        help: "Lowercase letters, numbers and hyphens.",
      },
    ],
  },
  {
    id: "gcp",
    name: "Google Cloud Storage",
    schema: gcpConfigSchema,
    fields: [
      {
        key: "serviceAccountJson",
        label: "Service Account JSON",
        placeholder: '{\n  "type": "service_account",\n  "project_id": "..."\n}',
        help: "Paste the full service-account key. Stored encrypted in your keychain.",
        secret: true,
        multiline: true,
      },
      {
        key: "bucket",
        label: "Bucket Name",
        placeholder: "my-annotation-bucket",
        help: "The GCS bucket where images are stored.",
      },
    ],
  },
]

const providerLabel = (provider: CloudProvider) =>
  PROVIDERS.find((entry) => entry.id === provider)?.name ?? provider.toUpperCase()

export default function CloudStorageSettings() {
  const {
    configs,
    isLoading,
    error,
    saveConfig,
    deleteConfig,
    setActiveConfig,
    testConnection,
    loadSecrets,
  } = useCloudStorageViewModel()
  const confirm = useConfirmDialog()

  const [provider, setProvider] = useState<CloudProvider>("aws")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [values, setValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)

  const def = PROVIDERS.find((entry) => entry.id === provider) ?? PROVIDERS[0]

  const clearError = (key: string) =>
    setErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })

  const resetEditor = () => {
    setEditingId(null)
    setProvider("aws")
    setName("")
    setValues({})
    setErrors({})
    setRevealed({})
  }

  const handleProviderChange = (next: CloudProvider) => {
    setProvider(next)
    setValues({})
    setErrors({})
    setRevealed({})
  }

  const setField = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    clearError(key)
  }

  const handleEdit = async (config: CloudStorageConfig) => {
    const secrets = await loadSecrets(config)
    setEditingId(config.id)
    setProvider(config.provider)
    setName(config.name)
    setValues({ ...(config.config as Record<string, string>), ...secrets })
    setErrors({})
    setRevealed({})
  }

  const handleSave = async () => {
    const config: Record<string, string> = {}
    for (const field of def.fields) config[field.key] = values[field.key] ?? ""

    const nextErrors: Record<string, string> = {}
    if (!name.trim()) nextErrors.name = "Configuration name is required."
    const result = def.schema.safeParse(config)
    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? "")
        if (key && !nextErrors[key]) nextErrors[key] = issue.message
      }
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setSaving(true)
    try {
      const existing = editingId
        ? configs.find((entry) => entry.id === editingId)
        : undefined
      const payload: CloudStorageConfig = {
        id: editingId || crypto.randomUUID(),
        name: name.trim(),
        provider,
        config,
        isActive: existing?.isActive ?? false,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      await saveConfig(payload)
      toast.success(editingId ? "Configuration updated" : "Configuration added")
      resetEditor()
    } catch (saveError) {
      toast.error("Failed to save configuration", {
        description: String(saveError),
      })
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async (config: CloudStorageConfig) => {
    setTestingId(config.id)
    try {
      const result = await testConnection(config)
      if (result.ok) {
        toast.success("Connection successful", { description: config.name })
      } else {
        toast.error("Connection failed", { description: result.message })
      }
    } catch (testError) {
      toast.error("Connection failed", { description: String(testError) })
    } finally {
      setTestingId(null)
    }
  }

  const handleConnect = async (config: CloudStorageConfig) => {
    try {
      await setActiveConfig(config.id)
      toast.success("Connected", { description: config.name })
    } catch (connectError) {
      toast.error("Failed to connect", { description: String(connectError) })
    }
  }

  const handleDelete = async (config: CloudStorageConfig) => {
    const ok = await confirm({
      title: `Delete "${config.name}"?`,
      description:
        "This removes the configuration and its stored credentials from your keychain.",
      confirmText: "Delete",
      cancelText: "Cancel",
    })
    if (!ok) return
    try {
      await deleteConfig(config.id)
      if (editingId === config.id) resetEditor()
      toast.success("Configuration deleted")
    } catch (deleteError) {
      toast.error("Failed to delete configuration", {
        description: String(deleteError),
      })
    }
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Shield className="h-4 w-4 text-success" />
        <AlertDescription>
          <strong className="text-foreground">Stored securely.</strong>{" "}
          Credentials are encrypted in your system keychain — they never leave
          your device and are never written to plain settings.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* Inline editor — no modal, lives right here in settings. */}
      <SettingsSection
        icon={Cloud}
        title={editingId ? "Edit configuration" : "Add a configuration"}
        description="Enter your cloud storage credentials below to connect a bucket or container."
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cs-name">Configuration Name</Label>
            <Input
              id="cs-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                clearError("name")
              }}
              placeholder="My AWS Storage"
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Cloud Provider</Label>
            <Select
              value={provider}
              onValueChange={(value) =>
                handleProviderChange(value as CloudProvider)
              }
              disabled={!!editingId}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((entry) => (
                  <SelectItem key={entry.id} value={entry.id}>
                    {entry.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {editingId && (
              <p className="text-xs text-muted-foreground">
                The provider can't be changed while editing a configuration.
              </p>
            )}
          </div>

          {def.fields.map((field) => {
            const id = `cs-${field.key}`
            const masked = field.secret && !revealed[field.key]
            return (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={id}>{field.label}</Label>
                {field.multiline ? (
                  <Textarea
                    id={id}
                    rows={5}
                    value={values[field.key] ?? ""}
                    onChange={(event) => setField(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    className={`font-mono text-xs ${
                      errors[field.key] ? "border-destructive" : ""
                    }`}
                  />
                ) : (
                  <div className="relative">
                    <Input
                      id={id}
                      type={masked ? "password" : "text"}
                      value={values[field.key] ?? ""}
                      onChange={(event) =>
                        setField(field.key, event.target.value)
                      }
                      placeholder={field.placeholder}
                      className={`${field.secret ? "pr-10" : ""} ${
                        errors[field.key] ? "border-destructive" : ""
                      }`}
                    />
                    {field.secret && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full w-9 text-muted-foreground"
                        onClick={() =>
                          setRevealed((prev) => ({
                            ...prev,
                            [field.key]: !prev[field.key],
                          }))
                        }
                        aria-label={revealed[field.key] ? "Hide" : "Show"}
                      >
                        {revealed[field.key] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                )}
                {errors[field.key] ? (
                  <p className="text-xs text-destructive">
                    {errors[field.key]}
                  </p>
                ) : (
                  field.help && (
                    <p className="text-xs text-muted-foreground">{field.help}</p>
                  )
                )}
              </div>
            )
          })}

          <div className="flex items-center gap-2 pt-1">
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? (
                <>
                  <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  {editingId ? "Save changes" : "Add configuration"}
                </>
              )}
            </Button>
            {editingId && (
              <Button
                variant="outline"
                onClick={resetEditor}
                disabled={saving}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        icon={CheckCircle}
        title="Saved configurations"
        description="Test, connect, edit or remove your saved connections."
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        ) : configs.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Cloud className="mx-auto mb-3 h-10 w-10 opacity-50" />
            <p className="font-medium">No configurations yet</p>
            <p className="text-sm">
              Fill in the form above to connect your first bucket.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">{config.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {providerLabel(config.provider)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {config.isActive ? (
                        <Badge className="bg-success text-success-foreground">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="mr-1 h-3 w-3" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleTest(config)}
                          disabled={testingId === config.id}
                        >
                          <Play className="mr-1 h-4 w-4" />
                          {testingId === config.id ? "Testing…" : "Test"}
                        </Button>
                        {!config.isActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleConnect(config)}
                          >
                            Connect
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="Edit"
                          onClick={() => void handleEdit(config)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          aria-label="Delete"
                          onClick={() => void handleDelete(config)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SettingsSection>
    </div>
  )
}
