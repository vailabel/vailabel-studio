import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertCircle,
  Plus,
  Settings,
  Trash2,
  Play,
  Edit,
  CheckCircle,
  XCircle,
  Cloud,
  Shield,
} from "lucide-react"
import AWSConfigForm from "@/components/forms/AWSConfigForm"
import AzureConfigForm from "@/components/forms/AzureConfigForm"
import GCPConfigForm from "@/components/forms/GCPConfigForm"
import { useCloudStorageViewModel } from "@/viewmodels/cloud-storage-viewmodel"
import {
  awsConfigSchema,
  azureConfigSchema,
  gcpConfigSchema,
  CloudProvider,
  CloudConfigFormData,
} from "@/lib/schemas/cloud-storage"

export default function CloudStorageConfigPage() {
  const {
    configs,
    isLoading,
    error,
    saveConfig,
    deleteConfig,
    setActiveConfig,
    testConnection,
    activeConfig,
  } = useCloudStorageViewModel()

  const [showForm, setShowForm] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<CloudProvider>("aws")
  const [editingConfig, setEditingConfig] = useState<string | null>(null)
  const [testingConnection, setTestingConnection] = useState<string | null>(null)

  // Form setup
  const form = useForm<CloudConfigFormData>({
    resolver: zodResolver(
      selectedProvider === "aws" ? awsConfigSchema :
      selectedProvider === "azure" ? azureConfigSchema :
      gcpConfigSchema
    ),
    defaultValues: {
      name: "",
      provider: "aws",
      config: {} as any,
    },
  })

  // Handle form submission
  const onSubmit = async (data: CloudConfigFormData) => {
    try {
      const config = {
        id: editingConfig || crypto.randomUUID(),
        name: data.name,
        provider: selectedProvider,
        config: data.config,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      await saveConfig(config)
      setShowForm(false)
      setEditingConfig(null)
      form.reset()
    } catch (error) {
      console.error("Failed to save config:", error)
    }
  }

  // Handle edit
  const handleEdit = (configId: string) => {
    const config = configs.find(c => c.id === configId)
    if (config) {
      setEditingConfig(configId)
      setSelectedProvider(config.provider)
      form.reset({
        name: config.name,
        provider: config.provider,
        config: config.config,
      })
      setShowForm(true)
    }
  }

  // Handle delete
  const handleDelete = async (configId: string) => {
    if (confirm("Are you sure you want to delete this configuration?")) {
      try {
        await deleteConfig(configId)
      } catch (error) {
        console.error("Failed to delete config:", error)
      }
    }
  }

  // Handle test connection
  const handleTestConnection = async (configId: string) => {
    const config = configs.find(c => c.id === configId)
    if (config) {
      setTestingConnection(configId)
      try {
        await testConnection(config)
      } finally {
        setTestingConnection(null)
      }
    }
  }

  // Handle connect
  const handleConnect = async (configId: string) => {
    try {
      await setActiveConfig(configId)
    } catch (error) {
      console.error("Failed to connect:", error)
    }
  }

  // Close form
  const handleCloseForm = () => {
    setShowForm(false)
    setEditingConfig(null)
    form.reset()
  }

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
            <Cloud className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Cloud Storage Configuration</h1>
            <p className="text-muted-foreground">
              Manage your cloud storage connections for seamless data synchronization
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
          <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            <strong>Security First:</strong> All credentials are encrypted and stored securely in your system keychain. 
            Your secrets never leave your device and are never transmitted to external servers.
          </AlertDescription>
        </Alert>
      </div>

      {/* Active Configuration */}
      {activeConfig && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <CheckCircle className="h-5 w-5" />
              Active Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{activeConfig.name}</p>
                <Badge variant="secondary" className="mt-1">
                  {activeConfig.provider.toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-green-600">
                  Connected
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(activeConfig.id)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configurations Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Saved Configurations</CardTitle>
              <CardDescription>
                Manage your cloud storage connections
              </CardDescription>
            </div>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Configuration
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : configs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Cloud className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No configurations yet</p>
              <p className="text-sm">Add your first cloud storage configuration to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">{config.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {config.provider.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {config.isActive ? (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(config.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestConnection(config.id)}
                          disabled={testingConnection === config.id}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          {testingConnection === config.id ? "Testing..." : "Test"}
                        </Button>
                        {!config.isActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConnect(config.id)}
                          >
                            Connect
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(config.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(config.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Configuration Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? "Edit Configuration" : "Add New Configuration"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Configuration Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Configuration Name *</Label>
              <Input
                id="name"
                placeholder="My AWS Storage"
                {...form.register("name")}
                className={form.formState.errors.name ? "border-red-500" : ""}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>

            {/* Provider Selection */}
            <div className="space-y-2">
              <Label>Cloud Provider *</Label>
              <Select
                value={selectedProvider}
                onValueChange={(value: CloudProvider) => {
                  setSelectedProvider(value)
                  form.setValue("provider", value)
                }}
                disabled={!!editingConfig}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aws">AWS S3</SelectItem>
                  <SelectItem value="azure">Azure Blob Storage</SelectItem>
                  <SelectItem value="gcp">Google Cloud Storage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Provider-specific Forms */}
            {selectedProvider === "aws" && (
              <AWSConfigForm
                control={form.control}
                errors={form.formState.errors.config as any}
              />
            )}
            {selectedProvider === "azure" && (
              <AzureConfigForm
                control={form.control}
                errors={form.formState.errors.config as any}
              />
            )}
            {selectedProvider === "gcp" && (
              <GCPConfigForm
                control={form.control}
                errors={form.formState.errors.config as any}
              />
            )}

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={handleCloseForm}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? "Saving..."
                  : editingConfig
                  ? "Save Changes"
                  : "Add Configuration"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
