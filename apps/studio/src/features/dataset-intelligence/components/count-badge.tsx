import { Badge } from "@/shared/ui/badge"

/** Small tab-side counter; renders nothing when there is nothing to flag. */
export function CountBadge({ value }: { value: number }) {
  if (value <= 0) return null
  return (
    <Badge variant="secondary" className="ml-1 px-1.5 text-[10px] tabular-nums">
      {value}
    </Badge>
  )
}
