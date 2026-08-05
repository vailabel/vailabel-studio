import type * as React from "react"
import { ScanSearch } from "lucide-react"
import { cn } from "@/shared/lib/utils"

/** Shared "Dataset Intelligence" heading for the picker and dashboard screens. */
export function PageHeading({
  subtitle,
  actions,
  className,
}: {
  subtitle: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-4",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <ScanSearch className="size-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Dataset Intelligence
          </h1>
          {subtitle}
        </div>
      </div>
      {actions}
    </div>
  )
}
