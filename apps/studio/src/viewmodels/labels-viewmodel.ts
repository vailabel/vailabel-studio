import { useEffect, useMemo, useState } from "react"
import { Label, Project } from "@vailabel/core"
import { services } from "@/services"

export const useLabelsViewModel = (projectId?: string) => {
  const [projects, setProjects] = useState<Project[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProject, setSelectedProject] = useState<string | null>(
    projectId ?? null
  )

  const loadLabels = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const nextProjects = await services.getProjectService().list()
      setProjects(nextProjects)
      const scopedProjects = projectId
        ? nextProjects.filter((project) => project.id === projectId)
        : nextProjects
      const results = await Promise.all(
        scopedProjects.map((project) =>
          services.getLabelService().getLabelsByProjectId(project.id)
        )
      )
      setLabels(results.flat())
    } catch (nextError) {
      setError(nextError)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadLabels()
  }, [projectId])

  const filteredLabels = useMemo(() => {
    return labels.filter((label) => {
      const matchesProject =
        !selectedProject ||
        label.projectId === selectedProject ||
        label.project_id === selectedProject
      const matchesSearch =
        !searchQuery ||
        label.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        label.description?.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesProject && matchesSearch
    })
  }, [labels, selectedProject, searchQuery])

  return {
    labels: filteredLabels,
    allLabels: labels,
    projects,
    isLoading,
    error,
    searchQuery,
    selectedProject,
    setSearchQuery,
    setSelectedProject,
    createLabel: async (label: Omit<Label, "id">) => {
      const createdLabel = await services.getLabelService().createLabel(label)
      setLabels((current) => [createdLabel, ...current])
    },
    updateLabel: async (labelId: string, updates: Partial<Label>) => {
      const updatedLabel = await services
        .getLabelService()
        .updateLabel(labelId, updates)
      setLabels((current) =>
        current.map((label) => (label.id === labelId ? updatedLabel : label))
      )
    },
    deleteLabel: async (labelId: string) => {
      await services.getLabelService().deleteLabel(labelId)
      setLabels((current) => current.filter((label) => label.id !== labelId))
    },
    duplicateLabel: async (labelId: string) => {
      const label = labels.find((entry) => entry.id === labelId)
      if (!label) return
      const createdLabel = await services.getLabelService().createLabel({
        ...label,
        name: `${label.name} (Copy)`,
      })
      setLabels((current) => [createdLabel, ...current])
    },
    refreshLabels: loadLabels,
  }
}
