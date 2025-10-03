import { Controller, Control, FieldErrors } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Upload, 
  FileText, 
  Info, 
  CheckCircle, 
  AlertCircle,
  Brain,
  Cpu,
  HardDrive
} from "lucide-react"
import { AIModelFormData } from "@/lib/schemas/ai-model"
import { useState } from "react"

interface AIModelFormProps {
  control: Control<AIModelFormData>
  errors: FieldErrors<AIModelFormData>
  isUploading?: boolean
  uploadProgress?: number
}

export default function AIModelForm({ 
  control, 
  errors, 
  isUploading = false, 
  uploadProgress = 0 
}: AIModelFormProps) {
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      // Handle file drop - this would need to be connected to the form
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
            <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          AI Model Configuration
        </CardTitle>
        <CardDescription>
          Upload and configure your custom AI model for annotation tasks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Supported formats: PyTorch (.pt, .pth), ONNX (.onnx), TensorFlow (.h5, .pb), TensorFlow Lite (.tflite)
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {/* Model Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Model Name *
            </Label>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <Input
                  id="name"
                  placeholder="My Custom Model"
                  className={errors.name ? "border-red-500" : ""}
                  {...field}
                />
              )}
            />
            <p className="text-xs text-muted-foreground">
              A descriptive name for your model
            </p>
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description *
            </Label>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <Textarea
                  id="description"
                  rows={3}
                  placeholder="Describe what this model does and its capabilities..."
                  className={errors.description ? "border-red-500" : ""}
                  {...field}
                />
              )}
            />
            <p className="text-xs text-muted-foreground">
              Provide details about the model's purpose and capabilities
            </p>
            {errors.description && (
              <p className="text-xs text-red-500">{errors.description.message}</p>
            )}
          </div>

          {/* Version */}
          <div className="space-y-2">
            <Label htmlFor="version" className="text-sm font-medium">
              Version *
            </Label>
            <Controller
              name="version"
              control={control}
              render={({ field }) => (
                <Input
                  id="version"
                  placeholder="1.0.0"
                  className={errors.version ? "border-red-500" : ""}
                  {...field}
                />
              )}
            />
            <p className="text-xs text-muted-foreground">
              Semantic version (e.g., 1.0.0, 2.1.0-beta)
            </p>
            {errors.version && (
              <p className="text-xs text-red-500">{errors.version.message}</p>
            )}
          </div>

          {/* Model File Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Model File *
            </Label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : errors.modelFile
                  ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                  : "border-gray-300 dark:border-gray-600"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Controller
                name="modelFile"
                control={control}
                render={({ field: { onChange, value, ...field } }) => (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {value ? value.name : "Drop your model file here"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        or click to browse
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".pt,.pth,.onnx,.tflite,.h5,.pb"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          onChange(file)
                        }
                      }}
                      className="hidden"
                      id="modelFile"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('modelFile')?.click()}
                    >
                      Choose File
                    </Button>
                  </div>
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Maximum file size: 10GB. Supported formats: .pt, .pth, .onnx, .tflite, .h5, .pb
            </p>
            {errors.modelFile && (
              <p className="text-xs text-red-500">{errors.modelFile.message}</p>
            )}
          </div>

          {/* Config File Upload (Optional) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Configuration File (Optional)
            </Label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : errors.configFile
                  ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                  : "border-gray-300 dark:border-gray-600"
              }`}
            >
              <Controller
                name="configFile"
                control={control}
                render={({ field: { onChange, value, ...field } }) => (
                  <div className="space-y-2">
                    <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {value ? value.name : "Drop your config file here"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        or click to browse
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".json,.yaml,.yml,.cfg,.ini"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          onChange(file)
                        }
                      }}
                      className="hidden"
                      id="configFile"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('configFile')?.click()}
                    >
                      Choose File
                    </Button>
                  </div>
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Optional configuration file. Supported formats: .json, .yaml, .yml, .cfg, .ini
            </p>
            {errors.configFile && (
              <p className="text-xs text-red-500">{errors.configFile.message}</p>
            )}
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading model...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}
        </div>

        {/* System Requirements */}
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
          <Cpu className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <strong>System Requirements:</strong> Ensure your system has sufficient memory and GPU resources 
            for the model you're uploading. Large models may require significant computational resources.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
