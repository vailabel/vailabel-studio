import { Controller, Control, FieldErrors } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function AWSConfigForm({
  control,
  errors,
}: {
  control: Control<{
    accessKeyId: string
    secretAccessKey: string
    bucket: string
    region: string
  }>
  errors: FieldErrors<{
    accessKeyId: string
    secretAccessKey: string
    bucket: string
    region: string
  }>
}) {
  return (
    <>
      <div>
        <Label className="mb-1">Access Key ID</Label>
        <Controller
          name="accessKeyId"
          control={control}
          render={({ field }) => (
            <Input type="text" placeholder="e.g. AKIA..." {...field} />
          )}
        />
        <div className="text-xs text-muted-foreground mb-1">
          Your AWS IAM user&apos;s access key ID.
        </div>
        {errors?.accessKeyId && (
          <span className="text-red-500 text-xs">
            {errors.accessKeyId.message}
          </span>
        )}
      </div>
      <div>
        <Label className="mb-1">Secret Access Key</Label>
        <Controller
          name="secretAccessKey"
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
        {errors?.secretAccessKey && (
          <span className="text-red-500 text-xs">
            {errors.secretAccessKey.message}
          </span>
        )}
      </div>
      <div>
        <Label className="mb-1">Bucket Name</Label>
        <Controller
          name="bucket"
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
        {errors?.bucket && (
          <span className="text-red-500 text-xs">{errors.bucket.message}</span>
        )}
      </div>
      <div>
        <Label className="mb-1">Region</Label>
        <Controller
          name="region"
          control={control}
          render={({ field }) => (
            <Input type="text" placeholder="e.g. us-west-2" {...field} />
          )}
        />
        <div className="text-xs text-muted-foreground mb-1">
          The AWS region where your bucket is located (e.g. us-east-1).
        </div>
        {errors?.region && (
          <span className="text-red-500 text-xs">{errors.region.message}</span>
        )}
      </div>
    </>
  )
}
