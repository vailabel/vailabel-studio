import { BarChart3, CheckCircle2, ImageIcon, Layers } from "lucide-react"
import { Card, CardContent } from "@/shared/ui/card"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/shared/ui/item"

export interface ProjectStatsSummary {
  totalItems: number
  annotatedImages: number
  totalAnnotations: number
  totalLabels: number
}

/** The four headline counters above the tabs. */
export function ProjectStatsGrid({ stats }: { stats: ProjectStatsSummary }) {
  const tiles = [
    { label: "Images", value: stats.totalItems, icon: ImageIcon },
    {
      label: "Annotated",
      value: `${stats.annotatedImages} / ${stats.totalItems}`,
      icon: CheckCircle2,
    },
    { label: "Annotations", value: stats.totalAnnotations, icon: BarChart3 },
    { label: "Classes", value: stats.totalLabels, icon: Layers },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((tile) => (
        <Card key={tile.label} size="sm">
          <CardContent>
            <Item size="sm" className="p-0">
              <ItemMedia
                variant="icon"
                className="size-9 rounded-lg bg-muted text-muted-foreground"
              >
                <tile.icon className="size-4.5" />
              </ItemMedia>
              <ItemContent>
                <ItemDescription className="text-xs">{tile.label}</ItemDescription>
                <ItemTitle className="text-lg font-semibold tabular-nums">
                  {tile.value}
                </ItemTitle>
              </ItemContent>
            </Item>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
