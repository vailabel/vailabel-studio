import React from "react"
import {
  Tag,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Eye,
  BarChart3,
  Calendar,
  User,
  Folder,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { useLabelsViewModel } from "@/viewmodels/labels-viewmodel"
import { LabelCreateForm } from "@/components/labels/label-forms"
import { LabelStatsCard } from "@/components/labels/label-stats-card"

const LabelsPage: React.FC = () => {
  const {
    labels,
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

  const filteredLabels = labels.filter((label) => {
    const matchesSearch = label.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
    const matchesProject =
      !selectedProject || label.projectId === selectedProject
    return matchesSearch && matchesProject
  })

  if (error) {
    return (
      <div className="p-6 min-h-screen">
        <div className="text-center py-16">
          <div className="text-destructive mb-4">{error}</div>
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
          <LabelCreateForm onCreateLabel={createLabel} />
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
            value={labels.length}
            icon={Tag}
            color="bg-primary"
            trend={{ value: 12, isPositive: true }}
          />
          <LabelStatsCard
            title="Active Projects"
            value={projects.length}
            icon={Folder}
            color="bg-green-600"
            trend={{ value: 3, isPositive: true }}
          />
          <LabelStatsCard
            title="Most Used"
            value="Person"
            icon={User}
            color="bg-purple-600"
            trend={{ value: 45, isPositive: true }}
          />
          <LabelStatsCard
            title="Recent Activity"
            value="24h"
            icon={Calendar}
            color="bg-orange-600"
            trend={{ value: 8, isPositive: true }}
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
                <select
                  id="project"
                  value={selectedProject || ""}
                  onChange={(e) => setSelectedProject(e.target.value || null)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                >
                  <option value="">All Projects</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Labels Grid */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-foreground">
            Labels ({filteredLabels.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                    <div className="h-8 bg-muted rounded w-full"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredLabels.length === 0 ? (
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
              <LabelCreateForm onCreateLabel={createLabel} />
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredLabels.map((label) => (
              <Card
                key={label.id}
                className="hover:shadow-lg transition-shadow duration-200"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: label.color }}
                      />
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {label.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {projects.find((p) => p.id === label.projectId)
                            ?.name || "Unknown Project"}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => updateLabel(label.id, {})}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => duplicateLabel(label.id)}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          View Usage
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => deleteLabel(label.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Color</span>
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{
                          backgroundColor: label.color,
                          color: "white",
                          borderColor: label.color,
                        }}
                      >
                        {label.color}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Usage</span>
                      <span className="text-foreground font-medium">
                        {Math.floor(Math.random() * 100)} annotations
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Created</span>
                      <span className="text-foreground">
                        {new Date().toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default LabelsPage
