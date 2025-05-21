import { Controller, Control, FieldErrors } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export default function GCPConfigForm({
  control,
  errors,
}: {
  control: Control<{
    serviceAccountJson: string
    bucket: string
  }>
  errors: FieldErrors<{
    serviceAccountJson: string
    bucket: string
  }>
}) {
  return (
    <>
      <div>
        <Label className="mb-1">Service Account JSON</Label>
        <Controller
          name="serviceAccountJson"
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
        {errors?.serviceAccountJson && (
          <span className="text-red-500 text-xs">
            {errors.serviceAccountJson.message}
          </span>
        )}
      </div>
      <div>
        <Label className="mb-1">Bucket Name</Label>
        <Controller
          name="bucket"
          control={control}
          render={({ field }) => (
            <Input type="text" placeholder="e.g. my-gcp-bucket" {...field} />
          )}
        />
        <div className="text-xs text-muted-foreground mb-1">
          The name of your Google Cloud Storage bucket.
        </div>
        {errors?.bucket && (
          <span className="text-red-500 text-xs">{errors.bucket.message}</span>
        )}
      </div>
    </>
  )
}
