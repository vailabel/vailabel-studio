import { Controller, Control, FieldErrors } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Info } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

interface AzureFormData {
  accountName: string
  accountKey: string
  container: string
}

interface AzureConfigFormProps {
  control: Control<AzureFormData>
  errors: FieldErrors<AzureFormData>
}

export default function AzureConfigForm({ control, errors }: AzureConfigFormProps) {
  const [showAccountKey, setShowAccountKey] = useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
            <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">AZ</span>
          </div>
          Azure Blob Storage Configuration
        </CardTitle>
        <CardDescription>
          Configure your Azure Blob Storage credentials for cloud storage access
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
            <Label htmlFor="accountName" className="text-sm font-medium">
              Storage Account Name *
            </Label>
            <Controller
              name="accountName"
              control={control}
              render={({ field }) => (
                <Input
                  id="accountName"
                  type="text"
                  placeholder="mystorageaccount"
                  className={errors.accountName ? "border-red-500" : ""}
                  {...field}
                />
              )}
            />
            <p className="text-xs text-muted-foreground">
              The name of your Azure Storage account
            </p>
            {errors.accountName && (
              <p className="text-xs text-red-500">{errors.accountName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountKey" className="text-sm font-medium">
              Storage Account Key *
            </Label>
            <div className="relative">
              <Controller
                name="accountKey"
                control={control}
                render={({ field }) => (
                  <Input
                    id="accountKey"
                    type={showAccountKey ? "text" : "password"}
                    placeholder="Your Azure storage account key"
                    className={`pr-10 ${errors.accountKey ? "border-red-500" : ""}`}
                    {...field}
                  />
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowAccountKey(!showAccountKey)}
              >
                {showAccountKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The access key for your Azure Storage account. Keep this private.
            </p>
            {errors.accountKey && (
              <p className="text-xs text-red-500">{errors.accountKey.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="container" className="text-sm font-medium">
              Container Name *
            </Label>
            <Controller
              name="container"
              control={control}
              render={({ field }) => (
                <Input
                  id="container"
                  type="text"
                  placeholder="images"
                  className={errors.container ? "border-red-500" : ""}
                  {...field}
                />
              )}
            />
            <p className="text-xs text-muted-foreground">
              The name of the blob container where your images are stored
            </p>
            {errors.container && (
              <p className="text-xs text-red-500">{errors.container.message}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}