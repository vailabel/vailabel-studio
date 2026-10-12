import { useCallback, useMemo, useState } from "react"
import { toast } from "sonner"
import { Label, Project } from "@/shared/types/core"
import { useResource } from "@/shared/hooks/use-resource"
import { services } from "@/shared/services"

interface LabelLibrary {
  projects: Project[]
  labels: Label[]
  /** Number of annotations referencing each label. */
  usageByLabelId: Record<string, number>
}

const EMPTY_LIBRARY: LabelLibrary = {
  projects: [],
  labels: [],
  usageByLabelId: {},
}

async function loadLabelLibrary(projectId?: string): Promise<LabelLibrary> {
  const projects = await services.getProjectService().list()
  const scopedProjects = projectId
    ? projects.filter((project) => project.id === projectId)
    : projects
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

  const usageByLabelId: Record<string, number> = {}
  for (const annotation of annotationLists.flat()) {
    const labelId = annotation.labelId ?? annotation.label_id
    if (labelId) {
      usageByLabelId[labelId] = (usageByLabelId[labelId] ?? 0) + 1
    }
  }

  return { projects, labels: labelLists.flat(), usageByLabelId }
}

export const useLabelsViewModel = (projectId?: string) => {
  const loadLabels = useCallback(
    () => loadLabelLibrary(projectId),
    [projectId]
  )
  const {
    data: { projects, labels, usageByLabelId },
    isLoading,
    error,
    reload,
    mutate,
  } = useResource(loadLabels, {
    initialData: EMPTY_LIBRARY,
    invalidateOn: ["labels", "projects", "annotations"],
    shouldInvalidate: (event) => {
      const eventProjectId = event.projectId || event.project_id
      return !projectId || !eventProjectId || eventProjectId === projectId
    },
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProject, setSelectedProject] = useState<string | null>(
    projectId ?? null
  )

  const setLabels = useCallback(
    (update: (current: Label[]) => Label[]) =>
      mutate((library) => ({ ...library, labels: update(library.labels) })),
    [mutate]
  )

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
    refreshLabels: reload,
  }
}

