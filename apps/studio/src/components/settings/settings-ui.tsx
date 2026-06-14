import type { ComponentType, ReactNode } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/**
 * A titled settings card. Keeps every panel visually consistent so the page
 * reads as one coherent surface instead of a stack of ad-hoc cards.
 */
export function SettingsSection({
  icon: Icon,
  title,
  description,
  action,
  children,
  className,
}: {
  icon?: ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={cn("bg-card border-border", className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
              {title}
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

/**
 * A single labelled control row (label + description on the left, control on
 * the right). Used for switches, selects, and other inline controls.
 */
export function SettingRow({
  htmlFor,
  title,
  description,
  control,
  children,
}: {
  htmlFor?: string
  title: string
  description?: string
  /** Right-aligned control (preferred). */
  control?: ReactNode
  /** Full-width control rendered below the label instead. */
  children?: ReactNode
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <Label
            htmlFor={htmlFor}
            className="text-sm font-medium cursor-pointer"
          >
            {title}
          </Label>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {control && <div className="shrink-0">{control}</div>}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  )
}

/** A slider row with an inline value readout and optional flanking icons. */
export function SettingSlider({
  title,
  value,
  unit = "",
  leading,
  trailing,
  children,
}: {
  title: string
  value: string | number
  unit?: string
  leading?: ReactNode
  trailing?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{title}</Label>
        <span className="text-sm text-muted-foreground tabular-nums">
          {value}
          {unit}
        </span>
      </div>
      <div className="flex items-center gap-3">
        {leading}
        <div className="flex-1">{children}</div>
        {trailing}
      </div>
    </div>
  )
}
