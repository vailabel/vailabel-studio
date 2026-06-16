import { memo } from "react"
import { AlertTriangle } from "lucide-react"

/** Centered card used for the editor's empty / error / unsupported states. */
export const Notice = memo(
  ({
    icon,
    title,
    children,
  }: {
    icon: "error" | "info"
    title: string
    children: React.ReactNode
  }) => (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-md rounded-lg border border-border bg-card p-4 text-center">
        <AlertTriangle
          className={
            icon === "error"
              ? "mx-auto mb-2 size-6 text-destructive"
              : "mx-auto mb-2 size-6 text-muted-foreground"
          }
        />
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{children}</p>
      </div>
    </div>
  )
)

Notice.displayName = "Notice"
