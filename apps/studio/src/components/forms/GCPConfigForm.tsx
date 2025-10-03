import { Controller, Control, FieldErrors } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Info, FileText, Eye, EyeOff } from "lucide-react"
import { useState } from "react"

interface GCPFormData {
  serviceAccountJson: string
  bucket: string
}

interface GCPConfigFormProps {
  control: Control<GCPFormData>
  errors: FieldErrors<GCPFormData>
}

export default function GCPConfigForm({ control, errors }: GCPConfigFormProps) {
  const [showJson, setShowJson] = useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
            <span className="text-green-600 dark:text-green-400 font-bold text-sm">GCP</span>
          </div>
          Google Cloud Storage Configuration
        </CardTitle>
        <CardDescription>
          Configure your Google Cloud Storage credentials for cloud storage access
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Your credentials are stored securely and never leave your device.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="serviceAccountJson" className="text-sm font-medium">
              Service Account JSON *
            </Label>
            <div className="relative">
              <Controller
                name="serviceAccountJson"
                control={control}
                render={({ field }) => (
                  <Textarea
                    id="serviceAccountJson"
                    rows={6}
                    placeholder="Paste your GCP service account JSON here..."
                    className={`resize-none ${errors.serviceAccountJson ? "border-red-500" : ""}`}
                    {...field}
                  />
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => setShowJson(!showJson)}
              >
                {showJson ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Paste the full JSON credentials for a GCP service account with Storage access.
                You can download this from the Google Cloud Console.
              </p>
            </div>
            {errors.serviceAccountJson && (
              <p className="text-xs text-red-500">{errors.serviceAccountJson.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bucket" className="text-sm font-medium">
              Bucket Name *
            </Label>
            <Controller
              name="bucket"
              control={control}
              render={({ field }) => (
                <Input
                  id="bucket"
                  type="text"
                  placeholder="my-gcp-bucket"
                  className={errors.bucket ? "border-red-500" : ""}
                  {...field}
                />
              )}
            />
            <p className="text-xs text-muted-foreground">
              The name of your Google Cloud Storage bucket
            </p>
            {errors.bucket && (
              <p className="text-xs text-red-500">{errors.bucket.message}</p>
            )}
          </div>
        </div>

        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
          <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <strong>Security Tip:</strong> Make sure your service account has only the necessary permissions
            (Storage Object Viewer/Editor) and avoid using overly broad permissions.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}