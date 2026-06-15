import React, { useMemo } from "react"
import {
  Tag,
  Search,
  Filter,
  BarChart3,
  Hash,
  User,
  Folder,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select"
import { Skeleton } from "@/components/ui/skeleton"
import { useLabelsViewModel } from "@/viewmodels/labels-viewmodel"
import { LabelCreateForm } from "@/components/labels/label-forms"
import { LabelStatsCard } from "@/components/labels/label-stats-card"
import { LabelsTable } from "@/components/labels/labels-table"

const LabelsPage: React.FC = () => {
  const {
    labels,
    allLabels,
    usageByLabelId,
    projects,
    isLoading,
    error,
    searchQuery,
    selectedProject,
    setSearchQuery,
    setSelectedProject,
    createLabel,
    updateLabel,
    deleteLabel,
    duplicateLabel,
    refreshLabels,
  } = useLabelsViewModel()

  // Derived, real overview metrics (no placeholders).
  const { totalAnnotations, mostUsedLabel } = useMemo(() => {
    let total = 0
    let topId: string | null = null
    let topCount = 0
    for (const [id, count] of Object.entries(usageByLabelId)) {
      total += count
      if (count > topCount) {
        topCount = count
        topId = id
      }
    }
    const top = topId
      ? allLabels.find((label) => label.id === topId)
      : undefined
    return { totalAnnotations: total, mostUsedLabel: top?.name ?? "—" }
  }, [usageByLabelId, allLabels])

  if (error) {
    return (
      <div className="p-6 min-h-screen">
        <div className="text-center py-16">
          <div className="text-destructive mb-4">{String(error)}</div>
          <Button onClick={refreshLabels} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-extrabold text-foreground">
            Label Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Organize and manage your annotation labels across all projects
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button onClick={refreshLabels} variant="outline" size="sm">
            <Search className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <LabelCreateForm projects={projects} onCreateLabel={createLabel} />
        </div>
      </div>

      {/* Statistics */}
      <section className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-semibold text-foreground">Overview</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <LabelStatsCard
            title="Total Labels"
            value={allLabels.length}
            icon={Tag}
            color="bg-primary"
            isLoading={isLoading}
          />
          <LabelStatsCard
            title="Active Projects"
            value={projects.length}
            icon={Folder}
            color="bg-green-600"
            isLoading={isLoading}
          />
          <LabelStatsCard
            title="Most Used"
            value={mostUsedLabel}
            icon={User}
            color="bg-purple-600"
            isLoading={isLoading}
          />
          <LabelStatsCard
            title="Total Annotations"
            value={totalAnnotations}
            icon={Hash}
            color="bg-orange-600"
            isLoading={isLoading}
          />
        </div>
      </section>

      {/* Filters and Search */}
      <section className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Filter className="h-5 w-5 text-primary" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search">Search Labels</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by label name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="md:w-64">
                <Label htmlFor="project">Filter by Project</Label>
                <NativeSelect
                  id="project"
                  value={selectedProject || ""}
                  onChange={(e) => setSelectedProject(e.target.value || null)}
                  className="w-full"
                >
                  <NativeSelectOption value="">All Projects</NativeSelectOption>
                  {projects.map((project) => (
                    <NativeSelectOption key={project.id} value={project.id}>
                      {project.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Labels Grid */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-foreground">
            Labels ({labels.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="divide-y rounded-lg border bg-card">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4 p-3">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-56" />
                <Skeleton className="ml-auto h-4 w-24" />
              </div>
            ))}
          </div>
        ) : labels.length === 0 ? (
          <div className="text-center py-16">
            <Tag className="h-24 w-24 mx-auto mb-6 text-muted-foreground opacity-50" />
            <h3 className="text-2xl font-semibold mb-4 text-foreground">
              {searchQuery || selectedProject
                ? "No labels found"
                : "No labels yet"}
            </h3>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              {searchQuery || selectedProject
                ? "Try adjusting your search or filter criteria."
                : "Create your first label to start organizing your annotations."}
            </p>
            {!searchQuery && !selectedProject && (
              <LabelCreateForm projects={projects} onCreateLabel={createLabel} />
            )}
          </div>
        ) : (
          <LabelsTable
            labels={labels}
            projects={projects}
            usageByLabelId={usageByLabelId}
            onUpdateLabel={updateLabel}
            onDuplicateLabel={duplicateLabel}
            onDeleteLabel={deleteLabel}
          />
        )}
      </section>
    </div>
  )
}

export default LabelsPage
