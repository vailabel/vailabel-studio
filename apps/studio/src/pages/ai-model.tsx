import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Brain,
  CheckCircle,
  Cpu,
  HardDrive,
  Import,
  Settings,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import AIModelForm from "@/components/forms/AIModelForm"
import { useAIModelViewModel } from "@/viewmodels/ai-model-viewmodel"
import { aiModelFormSchema, type AIModelFormData } from "@/lib/schemas/ai-model"
import { useToast } from "@/hooks/use-toast"

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

export default function AIModelListPage() {
  const {
    availableModels = [],
    systemModels = [],
    isLoading,
    isImportingModel,
    selectedModel,
    deleteModel,
    activateModel,
    importModel,
    refreshModels,
  } = useAIModelViewModel()
  const { toast } = useToast()
  const [showAddModelModal, setShowAddModelModal] = useState(false)

  const form = useForm<AIModelFormData>({
    resolver: zodResolver(aiModelFormSchema),
    defaultValues: {
      name: "",
      description: "",
      version: "1.0.0",
      category: "detection",
      modelFilePath: "",
      configFilePath: "",
    },
  })

  const onSubmit = async (data: AIModelFormData) => {
    try {
      const importedModel = await importModel({
        name: data.name,
        description: data.description,
        version: data.version,
        category: data.category,
        modelFilePath: data.modelFilePath,
        configFilePath: data.configFilePath || undefined,
      })
      await activateModel(importedModel.id)
      await refreshModels()
      toast({
        title: "Model imported",
        description: `${importedModel.name} is ready for offline prediction generation.`,
      })
      setShowAddModelModal(false)
      form.reset({
        name: "",
        description: "",
        version: "1.0.0",
        category: "detection",
        modelFilePath: "",
        configFilePath: "",
      })
    } catch (error) {
      console.error("Failed to import model:", error)
      toast({
        title: "Import failed",
        description:
          error instanceof Error ? error.message : "The model could not be imported.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (modelId: string) => {
    if (!confirm("Are you sure you want to delete this model?")) return

    try {
      await deleteModel(modelId)
      toast({
        title: "Model deleted",
        description: "The local model entry was removed.",
      })
    } catch (error) {
      console.error("Failed to delete model:", error)
      toast({
        title: "Delete failed",
        description: "The model could not be removed.",
        variant: "destructive",
      })
    }
  }

  const handleSetActiveModel = async (modelId: string) => {
    try {
      await activateModel(modelId)
      toast({
        title: "Model activated",
        description: "This model is now the default local detector.",
      })
    } catch (error) {
      console.error("Failed to activate model:", error)
      toast({
        title: "Activation failed",
        description: "The model could not be activated.",
        variant: "destructive",
      })
    }
  }

  const totalModelSize = availableModels.reduce(
    (sum, model) => sum + (model.modelSize || 0),
    0
  )

  return (
    <div className="mx-auto max-w-7xl space-y-8 py-8">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">AI Models</h1>
            <p className="text-muted-foreground">
              Import and manage local models for offline prediction review.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Installed Models</p>
                  <p className="text-2xl font-bold">{availableModels.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Storage</p>
                  <p className="text-2xl font-bold">
                    {formatFileSize(totalModelSize)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium">Active Model</p>
                  <p className="text-lg font-bold">
                    {selectedModel?.name || "None"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-orange-600" />
                <div>
                  <p className="text-sm font-medium">Mode</p>
                  <p className="text-lg font-bold">Offline Only</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setShowAddModelModal(true)}>
            <Import className="mr-2 h-4 w-4" />
            Import Local Model
          </Button>
        </div>
      </div>

      <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
        <Cpu className="h-4 w-4 text-blue-600 dark:text-blue-300" />
        <AlertDescription>
          The desktop app no longer downloads remote model assets. Import local
          files instead to keep prediction generation fully offline.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="installed" className="space-y-6">
        <TabsList>
          <TabsTrigger value="installed">Installed Models</TabsTrigger>
          <TabsTrigger value="catalog">Reference Catalog</TabsTrigger>
        </TabsList>

        <TabsContent value="installed">
          <Card>
            <CardHeader>
              <CardTitle>Your Local Models</CardTitle>
              <CardDescription>
                Models available for local prediction generation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-8 text-center text-muted-foreground">
                  Loading models...
                </div>
              ) : availableModels.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No local models imported yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableModels.map((model) => (
                      <TableRow key={model.id}>
                        <TableCell className="font-medium">{model.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {model.category || "uncategorized"}
                          </Badge>
                        </TableCell>
                        <TableCell>v{model.version}</TableCell>
                        <TableCell>{formatFileSize(model.modelSize || 0)}</TableCell>
                        <TableCell>
                          {model.isActive ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-600">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              {model.status || "ready"}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {!model.isActive && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSetActiveModel(model.id)}
                              >
                                Activate
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(model.id)}
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
        </TabsContent>

        <TabsContent value="catalog">
          <Card>
            <CardHeader>
              <CardTitle>Reference Catalog</CardTitle>
              <CardDescription>
                Informational model families you can prepare locally and import.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {systemModels.map((model) => (
                  <Card key={model.id} className="border-dashed">
                    <CardHeader>
                      <CardTitle className="text-lg">{model.name}</CardTitle>
                      <CardDescription>{model.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span>Category</span>
                        <Badge variant="outline">{model.category}</Badge>
                      </div>
                      {model.requirements?.minMemory && (
                        <div className="flex items-center justify-between">
                          <span>Min Memory</span>
                          <span>{model.requirements.minMemory} MB</span>
                        </div>
                      )}
                      <p>
                        Import a compatible local checkpoint if you want to use
                        this family in the desktop app.
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showAddModelModal} onOpenChange={setShowAddModelModal}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Local Model</DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <AIModelForm
              control={form.control}
              errors={form.formState.errors}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddModelModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isImportingModel}>
                {isImportingModel ? "Importing..." : "Import Model"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
