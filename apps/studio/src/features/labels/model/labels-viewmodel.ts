import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Label, Project } from "@/shared/types/core"
import { listenToStudioEvents } from "@/shared/ipc/events"
import { services } from "@/shared/services"

export const useLabelsViewModel = (projectId?: string) => {
  const [projects, setProjects] = useState<Project[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [usageByLabelId, setUsageByLabelId] = useState<Record<string, number>>(
    {}
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProject, setSelectedProject] = useState<string | null>(
    projectId ?? null
  )

  const loadLabels = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const nextProjects = await services.getProjectService().list()
      setProjects(nextProjects)
      const scopedProjects = projectId
        ? nextProjects.filter((project) => project.id === projectId)
        : nextProjects
      const [labelLists, annotationLists] = await Promise.all([
        Promise.all(
          scopedProjects.map((project) =>
            services.getLabelService().getLabelsByProjectId(project.id)
          )
        ),
        Promise.all(
          scopedProjects.map((project) =>
            services.getAnnotationService().getAnnotationsByProjectId(project.id)
          )
        ),
      ])
      setLabels(labelLists.flat())

      // Real per-label usage = number of annotations referencing each label.
      const counts: Record<string, number> = {}
      for (const annotation of annotationLists.flat()) {
        const labelId = annotation.labelId ?? annotation.label_id
        if (labelId) {
          counts[labelId] = (counts[labelId] ?? 0) + 1
        }
      }
      setUsageByLabelId(counts)
    } catch (nextError) {
      setError(nextError)
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void loadLabels()
  }, [loadLabels])

  useEffect(() => {
    let unlisten: (() => void) | undefined

    void listenToStudioEvents((event) => {
      const eventProjectId = event.projectId || event.project_id
      if (projectId && eventProjectId && eventProjectId !== projectId) {
        return
      }
      void loadLabels()
    }, ["labels", "projects", "annotations"]).then((cleanup) => {
      unlisten = cleanup
    })

    return () => {
      unlisten?.()
    }
  }, [loadLabels, projectId])

  const filteredLabels = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return labels.filter((label) => {
      const matchesProject =
        !selectedProject ||
        label.projectId === selectedProject ||
        label.project_id === selectedProject
      const matchesSearch =
        !query ||
        label.name.toLowerCase().includes(query) ||
        label.description?.toLowerCase().includes(query) ||
        label.category?.toLowerCase().includes(query)
      return matchesProject && matchesSearch
    })
  }, [labels, selectedProject, searchQuery])

  return {
    labels: filteredLabels,
    allLabels: labels,
    usageByLabelId,
    projects,
    isLoading,
    error,
    searchQuery,
    selectedProject,
    setSearchQuery,
    setSelectedProject,
    createLabel: async (label: Omit<Label, "id">) => {
      try {
        const createdLabel = await services.getLabelService().createLabel(label)
        setLabels((current) => [createdLabel, ...current])
        toast.success(`Label "${createdLabel.name}" created`)
      } catch (nextError) {
        toast.error("Failed to create label")
        throw nextError
      }
    },
    updateLabel: async (labelId: string, updates: Partial<Label>) => {
      try {
        const updatedLabel = await services
          .getLabelService()
          .updateLabel(labelId, updates)
        setLabels((current) =>
          current.map((label) => (label.id === labelId ? updatedLabel : label))
        )
        toast.success("Label updated")
      } catch (nextError) {
        toast.error("Failed to update label")
        throw nextError
      }
    },
    deleteLabel: async (labelId: string) => {
      try {
        await services.getLabelService().deleteLabel(labelId)
        setLabels((current) => current.filter((label) => label.id !== labelId))
        toast.success("Label deleted")
      } catch (nextError) {
        toast.error("Failed to delete label")
        throw nextError
      }
    },
    duplicateLabel: async (labelId: string) => {
      const label = labels.find((entry) => entry.id === labelId)
      if (!label) return
      // Strip identity/relation fields so the backend creates a NEW label
      // instead of updating the original (labels_save is update-by-id).
      const { id, createdAt, updatedAt, annotations, project, ...rest } = label
      void id
      void createdAt
      void updatedAt
      void annotations
      void project
      try {
        const createdLabel = await services.getLabelService().createLabel({
          ...rest,
          name: `${label.name} (Copy)`,
        })
        setLabels((current) => [createdLabel, ...current])
        toast.success(`Label "${createdLabel.name}" created`)
      } catch (nextError) {
        toast.error("Failed to duplicate label")
        throw nextError
      }
    },
    refreshLabels: loadLabels,
  }
}

