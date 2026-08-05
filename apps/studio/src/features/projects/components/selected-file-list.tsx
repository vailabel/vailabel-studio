import type * as React from "react"
import { X } from "lucide-react"
import { Button } from "@/shared/ui/button"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/shared/ui/item"
import { cn } from "@/shared/lib/utils"

export interface SelectedFile {
  id: string
  name: string
  path?: string
}

/**
 * The staged-files list shared by project creation and the detail Upload tab:
 * one removable row per picked file. `limit` caps how many rows are rendered
 * (spreadsheet imports can run to thousands of rows).
 */
export function SelectedFileList({
  files,
  icon: Icon,
  onRemove,
  limit,
  scrollable = false,
}: {
  files: SelectedFile[]
  icon: React.ComponentType<{ className?: string }>
  onRemove: (index: number) => void
  limit?: number
  scrollable?: boolean
}) {
  const visible = limit ? files.slice(0, limit) : files

  return (
    <ItemGroup
      className={cn(
        "gap-0 divide-y divide-border rounded-lg border border-border",
        scrollable && "max-h-72 overflow-y-auto"
      )}
    >
      {visible.map((file, index) => (
        <Item key={file.id} size="xs" className="px-3 py-2">
          <ItemMedia>
            <Icon className="size-4 shrink-0 text-muted-foreground" />
          </ItemMedia>
          <ItemContent>
            <ItemTitle className="font-normal" title={file.path || file.name}>
              {file.name}
            </ItemTitle>
          </ItemContent>
          <ItemActions>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onRemove(index)}
              aria-label={`Remove ${file.name}`}
              className="rounded-full text-muted-foreground"
            >
              <X />
            </Button>
          </ItemActions>
        </Item>
      ))}
    </ItemGroup>
  )
}
