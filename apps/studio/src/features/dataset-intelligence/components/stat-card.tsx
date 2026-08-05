import type * as React from "react"
import { Gauge } from "lucide-react"
import { Card, CardContent } from "@/shared/ui/card"
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/shared/ui/item"
import { toneChip, scoreTone, type Tone } from "./tone"

/** Single metric tile: icon chip, label, value, optional hint. */
export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "neutral",
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  hint?: string
  tone?: Tone
}) {
  return (
    <Card size="sm">
      <CardContent>
        <Item size="sm" className="p-0">
          <ItemMedia variant="icon" className={toneChip(tone)}>
            <Icon className="size-5" />
          </ItemMedia>
          <ItemContent>
            <ItemDescription>{label}</ItemDescription>
            <ItemTitle className="text-xl font-bold">{value}</ItemTitle>
            {hint && <ItemDescription className="text-xs">{hint}</ItemDescription>}
          </ItemContent>
        </Item>
      </CardContent>
    </Card>
  )
}

/** Health score tile — same shape as StatCard, but the tone tracks the score. */
export function HealthScoreCard({ score }: { score: number }) {
  return (
    <Card size="sm">
      <CardContent>
        <Item size="sm" className="p-0">
          <ItemMedia variant="icon" className={toneChip(scoreTone(score))}>
            <Gauge className="size-5" />
          </ItemMedia>
          <ItemContent>
            <ItemDescription>Health score</ItemDescription>
            <ItemTitle className="text-xl font-bold">
              {score.toFixed(0)}
              <span className="text-sm font-normal text-muted-foreground">/100</span>
            </ItemTitle>
          </ItemContent>
        </Item>
      </CardContent>
    </Card>
  )
}
