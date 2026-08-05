import { memo } from "react"
import type { LabelingTemplate } from "@/shared/lib/label-config/labeling-templates"
import type { ImportGuide } from "@/features/projects/model/import-guide"
import { Badge } from "@/shared/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card"

function GuideSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mt-3 border-t border-border pt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  )
}

/**
 * Tells the user exactly what to import for the chosen template — including the
 * spreadsheet columns LLM-eval / tabular templates expect (derived from config).
 */
export const ImportGuideCard = memo(
  ({ template, guide }: { template?: LabelingTemplate; guide: ImportGuide }) => {
    const Icon = template?.icon

    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-semibold">
            {Icon && <Icon className="size-4 shrink-0 text-primary" />}
            {guide.title}
          </CardTitle>
          {template && (
            <CardDescription className="text-xs">
              for {template.label}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent>
          <p className="text-sm text-muted-foreground">{guide.detail}</p>

          {guide.columns.length > 0 && (
            <GuideSection title="Expected columns">
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {guide.columns.map((column) => (
                  <Badge
                    key={column.key}
                    variant="outline"
                    className="gap-1.5 bg-muted font-normal"
                  >
                    <code className="font-mono text-foreground">{column.key}</code>
                    {column.label !== column.key && (
                      <span className="text-muted-foreground">{column.label}</span>
                    )}
                  </Badge>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Your file's header row should include these columns (extra columns
                are ignored). To use different names, edit the field bindings in
                Labeling Setup.
              </p>
            </GuideSection>
          )}

          {guide.example && (
            <GuideSection title="Example">
              <pre className="mt-1.5 overflow-x-auto rounded-md border border-border bg-muted/50 p-3 text-xs leading-relaxed text-foreground">
                <code>{guide.example}</code>
              </pre>
            </GuideSection>
          )}
        </CardContent>
      </Card>
    )
  }
)

ImportGuideCard.displayName = "ImportGuideCard"
