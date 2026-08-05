import { useEffect, useState } from "react"
import { Boxes, Database } from "lucide-react"
import { services } from "@/shared/services"
import type { Project } from "@/shared/types/core"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/shared/ui/item"
import { PageHeading } from "./page-heading"
import { DatasetEmpty, DatasetLoading } from "./dataset-states"

/** Project chooser shown until a `projectId` is present in the URL. */
export function ProjectPicker({ onPick }: { onPick: (id: string) => void }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    void services
      .getProjectService()
      .list()
      .then(setProjects)
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <PageHeading
          className="mb-8"
          subtitle={
            <p className="text-muted-foreground">
              Choose a project to analyze its quality, balance, and outliers
            </p>
          }
        />

        {isLoading ? (
          <DatasetLoading label="Loading projects..." />
        ) : projects.length === 0 ? (
          <DatasetEmpty
            icon={Database}
            title="No projects yet"
            description="Create a project and add items before running analysis."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Item
                key={project.id}
                variant="outline"
                className="text-left hover:border-primary/50"
                render={<button type="button" onClick={() => onPick(project.id)} />}
              >
                <ItemMedia variant="icon" className="rounded-lg bg-muted p-2">
                  <Boxes className="size-5 text-foreground" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle className="font-semibold">{project.name}</ItemTitle>
                  <ItemDescription>
                    {project.description || "No description"}
                  </ItemDescription>
                </ItemContent>
              </Item>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
