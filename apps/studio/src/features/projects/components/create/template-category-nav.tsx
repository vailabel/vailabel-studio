import { ChevronRight } from "lucide-react"
import type { LabelingTemplate } from "@/shared/lib/label-config/labeling-templates"
import { cn } from "@/shared/lib/utils"

/** Left-hand category rail for the template gallery. */
export function TemplateCategoryNav({
  categories,
  active,
  onSelectCategory,
  customTemplate,
  onSelectCustom,
}: {
  categories: readonly string[]
  active: string
  onSelectCategory: (category: string) => void
  /** The "Custom" template, pinned below the categories when available. */
  customTemplate?: LabelingTemplate
  onSelectCustom: (template: LabelingTemplate) => void
}) {
  return (
    <nav className="w-56 shrink-0 overflow-y-auto border-r border-border py-2">
      {categories.map((category) => (
        <button
          key={category}
          type="button"
          onClick={() => onSelectCategory(category)}
          aria-current={category === active}
          className={cn(
            "flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm transition-colors",
            category === active
              ? "bg-muted font-medium text-foreground"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <span className="truncate">{category}</span>
          <ChevronRight className="size-4 shrink-0 opacity-60" />
        </button>
      ))}

      {customTemplate && (
        <button
          type="button"
          onClick={() => onSelectCustom(customTemplate)}
          aria-current={active === "Custom"}
          className={cn(
            "mt-1 w-full border-t border-border px-4 py-2 text-left text-sm font-medium text-primary transition-colors hover:bg-muted/50",
            active === "Custom" && "bg-muted"
          )}
        >
          Custom template
        </button>
      )}
    </nav>
  )
}
