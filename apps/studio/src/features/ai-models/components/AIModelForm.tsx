import { Controller, Control, FieldErrors } from "react-hook-form"
import { Input } from "@/shared/ui/input"
import { Textarea } from "@/shared/ui/textarea"
import { Label } from "@/shared/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card"
import { Alert, AlertDescription } from "@/shared/ui/alert"
import { Brain, Cpu, Info } from "lucide-react"
import { DesktopFileInput } from "@/shared/components/desktop-file"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select"
import { AIModelFormData } from "@/features/ai-models/model/schemas/ai-model"

interface AIModelFormProps {
  control: Control<AIModelFormData>
  errors: FieldErrors<AIModelFormData>
}

export default function AIModelForm({ control, errors }: AIModelFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
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
            ONNX models can also be installed directly from the catalog.
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
              <p className="text-xs text-destructive">{errors.name.message}</p>
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
              <p className="text-xs text-destructive">{errors.version.message}</p>
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
            <p className="text-xs text-destructive">{errors.description.message}</p>
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
            <p className="text-xs text-destructive">{errors.category.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Model File</Label>
          <Controller
            name="modelFilePath"
            control={control}
            render={({ field: { onChange, value } }) => (
              <DesktopFileInput
                accept=".onnx,.pt,.pth,.tflite,.h5,.pb"
                placeholder={value || "Choose a local model file"}
                onChange={(event) => onChange(event.target.files[0] || "")}
              />
            )}
          />
          <p className="text-xs text-muted-foreground">
            Preferred format: `.onnx` for the fastest offline local AI detect.
            Also supports: `.pt`, `.pth`, `.tflite`, `.h5`, `.pb`.
            PyTorch checkpoints are auto-converted to `.onnx` for local AI detect
            when Ultralytics is available on this machine.
          </p>
          {errors.modelFilePath && (
            <p className="text-xs text-destructive">
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
            <p className="text-xs text-destructive">
              {errors.configFilePath.message}
            </p>
          )}
        </div>

        <Alert className="border-warning/30 bg-warning/10">
          <Cpu className="h-4 w-4 text-warning" />
          <AlertDescription>
            Imported models are copied into the app data directory so prediction
            generation stays local and offline.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
