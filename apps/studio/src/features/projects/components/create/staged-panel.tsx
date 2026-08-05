import type * as React from "react"
import { Badge } from "@/shared/ui/badge"

/** Header + body wrapper for a list of files staged for import. */
export function StagedPanel({
  icon: Icon,
  title,
  count,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  /** Already-pluralised count text, e.g. "3 files". */
  count: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Icon className="size-5 text-primary" />
        <span className="font-semibold">{title}</span>
        <Badge variant="secondary">{count}</Badge>
      </div>
      {children}
    </div>
  )
}
