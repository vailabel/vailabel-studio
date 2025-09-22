import { Controller, Control, FieldErrors } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Info } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

interface AWSFormData {
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  region: string
}

interface AWSConfigFormProps {
  control: Control<AWSFormData>
  errors: FieldErrors<AWSFormData>
}

export default function AWSConfigForm({ control, errors }: AWSConfigFormProps) {
  const [showSecretKey, setShowSecretKey] = useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
            <span className="text-orange-600 dark:text-orange-400 font-bold text-sm">AWS</span>
          </div>
          AWS S3 Configuration
        </CardTitle>
        <CardDescription>
          Configure your AWS S3 credentials for cloud storage access
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
            <Label htmlFor="accessKeyId" className="text-sm font-medium">
              Access Key ID *
            </Label>
            <Controller
              name="accessKeyId"
              control={control}
              render={({ field }) => (
                <Input
                  id="accessKeyId"
                  type="text"
                  placeholder="AKIA..."
                  className={errors.accessKeyId ? "border-red-500" : ""}
                  {...field}
                />
              )}
            />
            <p className="text-xs text-muted-foreground">
              Your AWS IAM user's access key ID
            </p>
            {errors.accessKeyId && (
              <p className="text-xs text-red-500">{errors.accessKeyId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="secretAccessKey" className="text-sm font-medium">
              Secret Access Key *
            </Label>
            <div className="relative">
              <Controller
                name="secretAccessKey"
                control={control}
                render={({ field }) => (
                  <Input
                    id="secretAccessKey"
                    type={showSecretKey ? "text" : "password"}
                    placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYzEXAMPLEKEY"
                    className={`pr-10 ${errors.secretAccessKey ? "border-red-500" : ""}`}
                    {...field}
                  />
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowSecretKey(!showSecretKey)}
              >
                {showSecretKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your AWS IAM user's secret access key. Keep this private.
            </p>
            {errors.secretAccessKey && (
              <p className="text-xs text-red-500">{errors.secretAccessKey.message}</p>
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
                  placeholder="my-annotation-bucket"
                  className={errors.bucket ? "border-red-500" : ""}
                  {...field}
                />
              )}
            />
            <p className="text-xs text-muted-foreground">
              The name of your S3 bucket where images are stored
            </p>
            {errors.bucket && (
              <p className="text-xs text-red-500">{errors.bucket.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="region" className="text-sm font-medium">
              Region *
            </Label>
            <Controller
              name="region"
              control={control}
              render={({ field }) => (
                <Input
                  id="region"
                  type="text"
                  placeholder="us-west-2"
                  className={errors.region ? "border-red-500" : ""}
                  {...field}
                />
              )}
            />
            <p className="text-xs text-muted-foreground">
              The AWS region where your bucket is located (e.g., us-east-1, eu-west-1)
            </p>
            {errors.region && (
              <p className="text-xs text-red-500">{errors.region.message}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}