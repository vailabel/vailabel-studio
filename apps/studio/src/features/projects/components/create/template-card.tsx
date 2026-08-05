import { memo } from "react"
import { Clock } from "lucide-react"
import type { LabelingTemplate } from "@/shared/lib/label-config/labeling-templates"
import { Badge } from "@/shared/ui/badge"
import { TemplateIllustration } from "@/features/projects/components/template-illustrations"
import { cn } from "@/shared/lib/utils"

/** A template tile with an illustrated "thumbnail" header (gallery style). */
export const TemplateCard = memo(
  ({
    template,
    selected,
    onSelect,
  }: {
    template: LabelingTemplate
    selected: boolean
    onSelect: (template: LabelingTemplate) => void
  }) => {
    const available = template.status === "available"

    return (
      <button
        type="button"
        disabled={!available}
        onClick={() => onSelect(template)}
        aria-pressed={selected}
        className={cn(
          "group flex flex-col overflow-hidden rounded-lg border text-left transition-all",
          selected
            ? "border-primary ring-2 ring-primary"
            : available
              ? "border-border hover:border-primary/50 hover:shadow-sm"
              : "cursor-not-allowed border-dashed border-border opacity-60"
        )}
      >
        <div className="aspect-[4/3] overflow-hidden bg-muted">
          {template.image ? (
            <img
              src={template.image}
              alt={template.label}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <TemplateIllustration template={template} className="h-full w-full" />
          )}
        </div>
        <div className="flex items-start gap-1.5 p-3">
          <p className="min-w-0 flex-1 text-sm font-medium leading-snug">
            {template.label}
          </p>
          {!available && (
            <Badge variant="secondary" className="gap-1 text-warning">
              <Clock className="size-3" />
              Soon
            </Badge>
          )}
        </div>
      </button>
    )
  }
)

TemplateCard.displayName = "TemplateCard"
