import { Controller, Control, FieldErrors } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function AzureConfigForm({
  control,
  errors,
}: {
  control: Control<{
    accountName: string
    accountKey: string
    container: string
  }>
  errors: FieldErrors<{
    accountName: string
    accountKey: string
    container: string
  }>
}) {
  return (
    <>
      <div>
        <Label className="mb-1">Account Name</Label>
        <Controller
          name="accountName"
          control={control}
          render={({ field }) => (
            <Input type="text" placeholder="e.g. mystorageaccount" {...field} />
          )}
        />
        <div className="text-xs text-muted-foreground mb-1">
          The name of your Azure Storage account.
        </div>
        {errors?.accountName && (
          <span className="text-red-500 text-xs">
            {errors.accountName.message}
          </span>
        )}
      </div>
      <div>
        <Label className="mb-1">Account Key</Label>
        <Controller
          name="accountKey"
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
        {errors?.accountKey && (
          <span className="text-red-500 text-xs">
            {errors.accountKey.message}
          </span>
        )}
      </div>
      <div>
        <Label className="mb-1">Container Name</Label>
        <Controller
          name="container"
          control={control}
          render={({ field }) => (
            <Input type="text" placeholder="e.g. images" {...field} />
          )}
        />
        <div className="text-xs text-muted-foreground mb-1">
          The name of the blob container where your images are stored.
        </div>
        {errors?.container && (
          <span className="text-red-500 text-xs">
            {errors.container.message}
          </span>
        )}
      </div>
    </>
  )
}
