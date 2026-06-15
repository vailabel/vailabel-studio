import { Check, Clock, Eye, Languages, Wrench } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { AIModel } from "@/types/core"
import {
  MODEL_CATALOG,
  type CatalogModelEntry,
  type ModelDomain,
} from "@/lib/model-catalog"

const DOMAIN_ICON: Record<ModelDomain, typeof Eye> = {
  vision: Eye,
  nlp: Languages,
}

function ModelStatus({
  entry,
  models,
}: {
  entry: CatalogModelEntry
  models: AIModel[]
}) {
  if (entry.availability === "planned") {
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <Clock className="size-3" />
        Coming soon
      </Badge>
    )
  }
  if (entry.isInstalled?.(models)) {
    return (
      <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-600">
        <Check className="size-3" />
        Installed
      </Badge>
    )
  }
  return <Badge variant="secondary">Available</Badge>
}

interface ModelLibraryProps {
  availableModels: AIModel[]
}

/**
 * Read-only catalog of the model families the app knows about, grouped by
 * domain and the capability/tool each one powers. Installable families (YOLO,
 * SAM) link to the Model packs tab; everything else is marked "Coming soon".
 */
export function ModelLibrary({ availableModels }: ModelLibraryProps) {
  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-muted-foreground">
        There's no single active model — each tool uses the model that fits it,
        and the copilot LLM routes between them. Install the runnable families
        from <span className="font-medium text-foreground">Model packs</span>;
        the rest are on the roadmap.
      </p>

      {MODEL_CATALOG.map((group) => {
        const DomainIcon = DOMAIN_ICON[group.domain]
        return (
          <section key={group.domain} className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <DomainIcon className="size-5 text-muted-foreground" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {group.title}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {group.description}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {group.capabilities.map((capability) => (
                <Card key={capability.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-base">
                      {capability.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1.5">
                      <Wrench className="size-3.5" />
                      {capability.tool}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-3">
                    <p className="text-sm text-muted-foreground">
                      {capability.description}
                    </p>
                    <ul className="flex flex-col gap-2">
                      {capability.models.map((entry) => (
                        <li
                          key={entry.id}
                          className={cn(
                            "flex flex-col gap-1.5 rounded-lg border border-border p-3",
                            entry.availability === "planned" && "opacity-80"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-foreground">
                              {entry.name}
                            </span>
                            <ModelStatus entry={entry} models={availableModels} />
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {entry.usedFor.map((use) => (
                              <Badge
                                key={use}
                                variant="outline"
                                className="text-xs font-normal text-muted-foreground"
                              >
                                {use}
                              </Badge>
                            ))}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
