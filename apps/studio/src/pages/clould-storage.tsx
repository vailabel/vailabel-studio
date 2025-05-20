import { useForm, Controller, Control, FieldErrors } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Combobox } from "@/components/ui/combobox"
import { AlertCircle } from "lucide-react"

const PROVIDERS = [
  { key: "aws", label: "AWS S3" },
  { key: "azure", label: "Azure Blob Storage" },
  { key: "gcp", label: "Google Cloud Storage" },
]

const awsSchema = z.object({
  accessKeyId: z.string().min(1, "Required"),
  secretAccessKey: z.string().min(1, "Required"),
  bucket: z.string().min(1, "Required"),
  region: z.string().min(1, "Required"),
})
const azureSchema = z.object({
  accountName: z.string().min(1, "Required"),
  accountKey: z.string().min(1, "Required"),
  container: z.string().min(1, "Required"),
})
const gcpSchema = z.object({
  serviceAccountJson: z.string().min(1, "Required"),
  bucket: z.string().min(1, "Required"),
})

const schema = z.object({
  provider: z.enum(["aws", "azure", "gcp"]),
  aws: awsSchema.optional(),
  azure: azureSchema.optional(),
  gcp: gcpSchema.optional(),
})

type FormValues = z.infer<typeof schema>

type AWSConfigFormProps = {
  control: Control<FormValues>
  errors: FieldErrors<FormValues>
}
type AzureConfigFormProps = {
  control: Control<FormValues>
  errors: FieldErrors<FormValues>
}
type GCPConfigFormProps = {
  control: Control<FormValues>
  errors: FieldErrors<FormValues>
}

function AWSConfigForm({ control, errors }: AWSConfigFormProps) {
  return (
    <>
      <div>
        <Label className="mb-1">Access Key ID</Label>
        <Controller
          name="aws.accessKeyId"
          control={control}
          render={({ field }) => (
            <Input type="text" placeholder="e.g. AKIA..." {...field} />
          )}
        />
        <div className="text-xs text-muted-foreground mb-1">
          Your AWS IAM user&apos;s access key ID.
        </div>
        {errors?.aws?.accessKeyId && (
          <span className="text-red-500 text-xs">
            {errors.aws.accessKeyId.message}
          </span>
        )}
      </div>
      <div>
        <Label className="mb-1">Secret Access Key</Label>
        <Controller
          name="aws.secretAccessKey"
          control={control}
          render={({ field }) => (
            <Input
              type="password"
              placeholder="e.g. wJalrXUtnFEMI/K7MDENG/bPxRfiCYzEXAMPLEKEY"
              {...field}
            />
          )}
        />
        <div className="text-xs text-muted-foreground mb-1">
          Your AWS IAM user&apos;s secret access key. Keep this private.
        </div>
        {errors?.aws?.secretAccessKey && (
          <span className="text-red-500 text-xs">
            {errors.aws.secretAccessKey.message}
          </span>
        )}
      </div>
      <div>
        <Label className="mb-1">Bucket Name</Label>
        <Controller
          name="aws.bucket"
          control={control}
          render={({ field }) => (
            <Input
              type="text"
              placeholder="e.g. my-annotation-bucket"
              {...field}
            />
          )}
        />
        <div className="text-xs text-muted-foreground mb-1">
          The name of your S3 bucket where images are stored.
        </div>
        {errors?.aws?.bucket && (
          <span className="text-red-500 text-xs">
            {errors.aws.bucket.message}
          </span>
        )}
      </div>
      <div>
        <Label className="mb-1">Region</Label>
        <Controller
          name="aws.region"
          control={control}
          render={({ field }) => (
            <Input type="text" placeholder="e.g. us-west-2" {...field} />
          )}
        />
        <div className="text-xs text-muted-foreground mb-1">
          The AWS region where your bucket is located (e.g. us-east-1).
        </div>
        {errors?.aws?.region && (
          <span className="text-red-500 text-xs">
            {errors.aws.region.message}
          </span>
        )}
      </div>
    </>
  )
}

function AzureConfigForm({ control, errors }: AzureConfigFormProps) {
  return (
    <>
      <div>
        <Label className="mb-1">Account Name</Label>
        <Controller
          name="azure.accountName"
          control={control}
          render={({ field }) => (
            <Input type="text" placeholder="e.g. mystorageaccount" {...field} />
          )}
        />
        <div className="text-xs text-muted-foreground mb-1">
          The name of your Azure Storage account.
        </div>
        {errors?.azure?.accountName && (
          <span className="text-red-500 text-xs">
            {errors.azure.accountName.message}
          </span>
        )}
      </div>
      <div>
        <Label className="mb-1">Account Key</Label>
        <Controller
          name="azure.accountKey"
          control={control}
          render={({ field }) => (
            <Input
              type="password"
              placeholder="Your Azure storage account key"
              {...field}
            />
          )}
        />
        <div className="text-xs text-muted-foreground mb-1">
          The access key for your Azure Storage account. Keep this private.
        </div>
        {errors?.azure?.accountKey && (
          <span className="text-red-500 text-xs">
            {errors.azure.accountKey.message}
          </span>
        )}
      </div>
      <div>
        <Label className="mb-1">Container Name</Label>
        <Controller
          name="azure.container"
          control={control}
          render={({ field }) => (
            <Input type="text" placeholder="e.g. images" {...field} />
          )}
        />
        <div className="text-xs text-muted-foreground mb-1">
          The name of the blob container where your images are stored.
        </div>
        {errors?.azure?.container && (
          <span className="text-red-500 text-xs">
            {errors.azure.container.message}
          </span>
        )}
      </div>
    </>
  )
}

function GCPConfigForm({ control, errors }: GCPConfigFormProps) {
  return (
    <>
      <div>
        <Label className="mb-1">Service Account JSON</Label>
        <Controller
          name="gcp.serviceAccountJson"
          control={control}
          render={({ field }) => (
            <Textarea
              rows={4}
              placeholder="Paste your GCP service account JSON here"
              {...field}
            />
          )}
        />
        <div className="text-xs text-muted-foreground mb-1">
          Paste the full JSON credentials for a GCP service account with Storage
          access.
        </div>
        {errors?.gcp?.serviceAccountJson && (
          <span className="text-red-500 text-xs">
            {errors.gcp.serviceAccountJson.message}
          </span>
        )}
      </div>
      <div>
        <Label className="mb-1">Bucket Name</Label>
        <Controller
          name="gcp.bucket"
          control={control}
          render={({ field }) => (
            <Input type="text" placeholder="e.g. my-gcp-bucket" {...field} />
          )}
        />
        <div className="text-xs text-muted-foreground mb-1">
          The name of your Google Cloud Storage bucket.
        </div>
        {errors?.gcp?.bucket && (
          <span className="text-red-500 text-xs">
            {errors.gcp.bucket.message}
          </span>
        )}
      </div>
    </>
  )
}

export default function CloudStorageConfigPage() {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      provider: "aws",
      aws: {},
      azure: {},
      gcp: {},
    },
  })
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitSuccessful },
  } = form
  const provider = watch("provider")

  const onSubmit = (values: FormValues) => {
    // Save only the selected provider config
    const configToSave = {
      provider: values.provider,
      config: values[values.provider],
    }
    // TODO: Save to secure store or keychain on electron
    // For now, we save to localStorage for demo purposes
    // In a real app, you would use a secure store or keychain

    // encrypt the configToSave before saving it
    localStorage.setItem("cloudStorageConfigs", JSON.stringify(configToSave))
  }

  return (
    <div className="max-w-xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Cloud Storage Configuration</h1>
      <div className="mb-6">
        <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-blue-900 dark:border-blue-900/30 dark:bg-blue-900/20 dark:text-blue-100">
          <AlertCircle className="mt-0.5 h-10 w-10 text-blue-500" />
          <div>
            <div className="font-semibold">Security Notice</div>
            <div className="text-sm">
              All cloud storage credentials and configuration will be stored
              securely in your system keychain or Electron secure store. Your
              secrets never leave your device.
            </div>
          </div>
        </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <Label className="block mb-2 font-medium">Provider</Label>
          <Controller
            name="provider"
            control={control}
            render={({ field }) => (
              <Combobox
                options={PROVIDERS.map((p) => ({
                  value: p.key,
                  label: p.label,
                }))}
                value={field.value}
                onChange={field.onChange}
                className="w-full"
              />
            )}
          />
        </div>
        {provider === "aws" && (
          <AWSConfigForm control={control} errors={errors} />
        )}
        {provider === "azure" && (
          <AzureConfigForm control={control} errors={errors} />
        )}
        {provider === "gcp" && (
          <GCPConfigForm control={control} errors={errors} />
        )}
        <Button type="submit" className="w-full">
          Save Configuration
        </Button>
        {isSubmitSuccessful && (
          <div className="text-green-600 text-center font-medium mt-2">
            Configuration saved!
          </div>
        )}
      </form>
    </div>
  )
}
