import type * as React from "react"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/shared/ui/empty"
import { Spinner } from "@/shared/ui/spinner"

/** Full-height placeholder for a screen with nothing to show yet. */
export function DatasetEmpty({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  )
}

/** Blocking loading state, sized to roughly match the content it replaces. */
export function DatasetLoading({ label }: { label: string }) {
  return (
    <Empty className="h-64">
      <EmptyHeader>
        <Spinner className="size-8 text-primary" />
        <EmptyDescription>{label}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

/** One-line "nothing here" note used inside panels and tabs. */
export function InlineNote({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>
}
