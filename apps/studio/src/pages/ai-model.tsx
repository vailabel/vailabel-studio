import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Plus,
  Download,
  Play,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Brain,
  Settings,
  HardDrive,
  Cpu,
  Zap,
  BarChart3,
  Star,
  TrendingUp,
} from "lucide-react"
import AIModelForm from "@/components/forms/AIModelForm"
import { useAIModelViewModel } from "@/viewmodels/ai-model-viewmodel"
import { aiModelFormSchema, AIModelFormData } from "@/lib/schemas/ai-model"

export default function AIModelListPage() {
  const {
    models,
    systemModels,
    isLoading,
    isUploading,
    activeModel,
    createModel,
    deleteModel,
    downloadSystemModel,
    setActiveModel,
    testModel,
    modelsByCategory,
    customModels,
    totalModelsCount,
    totalModelSize,
  } = useAIModelViewModel()

  const [showAddModelModal, setShowAddModelModal] = useState(false)
  const [showSystemModelModal, setShowSystemModelModal] = useState(false)
  const [testingModel, setTestingModel] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Form setup
  const form = useForm<AIModelFormData>({
    resolver: zodResolver(aiModelFormSchema),
    defaultValues: {
      name: "",
      description: "",
      version: "1.0.0",
    },
  })

  // Handle form submission
  const onSubmit = async (data: AIModelFormData) => {
    try {
      await createModel(data)
      setShowAddModelModal(false)
      form.reset()
      setUploadProgress(0)
    } catch (error) {
      console.error("Failed to create model:", error)
    }
  }

  // Handle delete
  const handleDelete = async (modelId: string) => {
    if (confirm("Are you sure you want to delete this model?")) {
      try {
        await deleteModel(modelId)
      } catch (error) {
        console.error("Failed to delete model:", error)
      }
    }
  }

  // Handle test model
  const handleTestModel = async (modelId: string) => {
    setTestingModel(modelId)
    try {
      await testModel(modelId)
    } finally {
      setTestingModel(null)
    }
  }

  // Handle download system model
  const handleDownloadSystemModel = async (modelId: string, variant?: string) => {
    try {
      await downloadSystemModel(modelId, variant)
    } catch (error) {
      console.error("Failed to download model:", error)
    }
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "segmentation":
        return <Brain className="h-4 w-4" />
      case "detection":
        return <Zap className="h-4 w-4" />
      case "classification":
        return <BarChart3 className="h-4 w-4" />
      case "tracking":
        return <TrendingUp className="h-4 w-4" />
      case "pose":
        return <Star className="h-4 w-4" />
      default:
        return <Brain className="h-4 w-4" />
    }
  }

  return (
    <div className="max-w-7xl mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
            <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">AI Models</h1>
            <p className="text-muted-foreground">
              Manage your AI models for intelligent annotation and detection
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Total Models</p>
                  <p className="text-2xl font-bold">{totalModelsCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Total Size</p>
                  <p className="text-2xl font-bold">{formatFileSize(totalModelSize)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-sm font-medium">Active Model</p>
                  <p className="text-lg font-bold">{activeModel?.name || "None"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-orange-600" />
                <div>
                  <p className="text-sm font-medium">Custom Models</p>
                  <p className="text-2xl font-bold">{customModels.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={() => setShowAddModelModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Custom Model
          </Button>
          <Button variant="outline" onClick={() => setShowSystemModelModal(true)}>
            <Download className="h-4 w-4 mr-2" />
            Browse System Models
          </Button>
        </div>
      </div>

      {/* Active Model Alert */}
      {activeModel && (
        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            <strong>Active Model:</strong> {activeModel.name} (v{activeModel.version}) - {activeModel.description}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs defaultValue="models" className="space-y-6">
        <TabsList>
          <TabsTrigger value="models">My Models</TabsTrigger>
          <TabsTrigger value="system">System Models</TabsTrigger>
          <TabsTrigger value="categories">By Category</TabsTrigger>
        </TabsList>

        {/* My Models Tab */}
        <TabsContent value="models" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your AI Models</CardTitle>
              <CardDescription>
                Manage your custom and downloaded AI models
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : models.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No models yet</p>
                  <p className="text-sm">Upload your first AI model to get started</p>
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
                      <TableHead>Last Used</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {models.map((model) => (
                      <TableRow key={model.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(model.category || "uncategorized")}
                            {model.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {model.category || "uncategorized"}
                          </Badge>
                        </TableCell>
                        <TableCell>v{model.version}</TableCell>
                        <TableCell>{formatFileSize(model.modelSize)}</TableCell>
                        <TableCell>
                          {model.isActive ? (
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
                          {model.lastUsed ? new Date(model.lastUsed).toLocaleDateString() : "Never"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTestModel(model.id)}
                              disabled={testingModel === model.id}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              {testingModel === model.id ? "Testing..." : "Test"}
                            </Button>
                            {!model.isActive && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setActiveModel(model.id)}
                              >
                                Activate
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {/* TODO: Implement edit functionality */}}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
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

        {/* System Models Tab */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Models</CardTitle>
              <CardDescription>
                Pre-trained models available for download
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {systemModels.map((model) => (
                  <Card key={model.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {getCategoryIcon(model.category)}
                        {model.name}
                      </CardTitle>
                      <CardDescription>{model.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Model Info */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {model.accuracy && (
                          <div className="flex items-center gap-1">
                            <BarChart3 className="h-4 w-4" />
                            {model.accuracy}% accuracy
                          </div>
                        )}
                        {model.speed && (
                          <div className="flex items-center gap-1">
                            <Zap className="h-4 w-4" />
                            {model.speed} speed
                          </div>
                        )}
                        {model.size && (
                          <div className="flex items-center gap-1">
                            <HardDrive className="h-4 w-4" />
                            {formatFileSize(model.size)}
                          </div>
                        )}
                      </div>

                      {/* Variants */}
                      {model.variants ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Available Variants:</p>
                          {model.variants.map((variant) => (
                            <div key={variant.name} className="flex items-center justify-between p-2 border rounded">
                              <div>
                                <p className="text-sm font-medium">{variant.name}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  {variant.size && <span>{formatFileSize(variant.size)}</span>}
                                  {variant.accuracy && <span>{variant.accuracy}% accuracy</span>}
                                  {variant.speed && <span>{variant.speed}</span>}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleDownloadSystemModel(model.id, variant.name)}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Button
                          className="w-full"
                          onClick={() => handleDownloadSystemModel(model.id)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download Model
                        </Button>
                      )}

                      {/* Requirements */}
                      {model.requirements && (
                        <Alert>
                          <Cpu className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Requirements:</strong>{" "}
                            {model.requirements.minMemory && `Min ${model.requirements.minMemory}MB RAM`}
                            {model.requirements.gpuRequired && ", GPU required"}
                            {model.requirements.cudaVersion && `, CUDA ${model.requirements.cudaVersion}`}
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          {Object.entries(modelsByCategory).map(([category, categoryModels]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getCategoryIcon(category)}
                  {category.charAt(0).toUpperCase() + category.slice(1)} Models
                </CardTitle>
                <CardDescription>
                  {categoryModels.length} model{categoryModels.length !== 1 ? 's' : ''} in this category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryModels.map((model) => (
                    <Card key={model.id} className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardHeader>
                        <CardTitle className="text-lg">{model.name}</CardTitle>
                        <CardDescription>{model.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Version</span>
                            <Badge variant="outline">v{model.version}</Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>Size</span>
                            <span>{formatFileSize(model.modelSize)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>Status</span>
                            {model.isActive ? (
                              <Badge variant="default" className="bg-green-600">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Add Model Modal */}
      <Dialog open={showAddModelModal} onOpenChange={setShowAddModelModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New AI Model</DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <AIModelForm
              control={form.control}
              errors={form.formState.errors}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
            />

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={() => form.reset()}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isUploading}>
                {isUploading ? "Uploading..." : "Add Model"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* System Models Modal */}
      <Dialog open={showSystemModelModal} onOpenChange={setShowSystemModelModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>System Models</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {systemModels.map((model) => (
              <Card key={model.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getCategoryIcon(model.category)}
                    {model.name}
                  </CardTitle>
                  <CardDescription>{model.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Implementation similar to system models tab */}
                </CardContent>
              </Card>
            ))}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}