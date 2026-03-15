import { Controller, Control, FieldErrors } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Brain, Cpu, Info } from "lucide-react"
import { DesktopFileInput } from "@/components/desktop-file"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AIModelFormData } from "@/lib/schemas/ai-model"

interface AIModelFormProps {
  control: Control<AIModelFormData>
  errors: FieldErrors<AIModelFormData>
}

export default function AIModelForm({ control, errors }: AIModelFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <Brain className="h-4 w-4" />
          </div>
          Local AI Model Import
        </CardTitle>
        <CardDescription>
          Register a local model file for offline prediction generation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Use this form when you already have a model file on disk. Curated
            checkpoints can also be installed directly from the catalog.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Model Name</Label>
            <Controller
              name="name"
              control={control}
              render={({ field }) => <Input id="name" {...field} />}
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="version">Version</Label>
            <Controller
              name="version"
              control={control}
              render={({ field }) => <Input id="version" {...field} />}
            />
            {errors.version && (
              <p className="text-xs text-red-500">{errors.version.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <Textarea id="description" rows={3} {...field} />
            )}
          />
          {errors.description && (
            <p className="text-xs text-red-500">{errors.description.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose model category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="detection">Detection</SelectItem>
                  <SelectItem value="segmentation">Segmentation</SelectItem>
                  <SelectItem value="classification">Classification</SelectItem>
                  <SelectItem value="tracking">Tracking</SelectItem>
                  <SelectItem value="pose">Pose</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.category && (
            <p className="text-xs text-red-500">{errors.category.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Model File</Label>
          <Controller
            name="modelFilePath"
            control={control}
            render={({ field: { onChange, value } }) => (
              <DesktopFileInput
                accept=".pt,.pth,.onnx,.tflite,.h5,.pb"
                placeholder={value || "Choose a local model file"}
                onChange={(event) => onChange(event.target.files[0] || "")}
              />
            )}
          />
          <p className="text-xs text-muted-foreground">
            Supported formats: `.pt`, `.pth`, `.onnx`, `.tflite`, `.h5`, `.pb`
          </p>
          {errors.modelFilePath && (
            <p className="text-xs text-red-500">
              {errors.modelFilePath.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Config File</Label>
          <Controller
            name="configFilePath"
            control={control}
            render={({ field: { onChange, value } }) => (
              <DesktopFileInput
                accept=".json,.yaml,.yml,.cfg,.ini"
                placeholder={value || "Optional config file"}
                onChange={(event) => onChange(event.target.files[0] || "")}
              />
            )}
          />
          {errors.configFilePath && (
            <p className="text-xs text-red-500">
              {errors.configFilePath.message}
            </p>
          )}
        </div>

        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <Cpu className="h-4 w-4 text-amber-600 dark:text-amber-300" />
          <AlertDescription>
            Imported models are copied into the app data directory so prediction
            generation stays local and offline.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
