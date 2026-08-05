import { cn } from "@/shared/lib/utils"

/** Severity accent shared by stat tiles, health score, and issue sections. */
export type Tone = "error" | "warning" | "info" | "neutral"

const toneClasses: Record<Tone, string> = {
  error: "bg-destructive/10 text-destructive",
  warning: "bg-warning/15 text-warning",
  info: "bg-info/15 text-info",
  neutral: "bg-muted text-foreground",
}

/** Classes for the rounded icon chip that carries a tone. */
export function toneChip(tone: Tone, className?: string): string {
  return cn("rounded-lg p-2", toneClasses[tone], className)
}

/** Health score thresholds, shared by the score card and any future badge. */
export function scoreTone(score: number): Tone {
  if (score >= 85) return "info"
  if (score >= 60) return "warning"
  return "error"
}
