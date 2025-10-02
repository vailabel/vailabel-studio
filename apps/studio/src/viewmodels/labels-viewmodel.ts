import { useState, useEffect, useCallback } from "react"
import { useServices } from "@/services/ServiceProvider"
import { useToast } from "@/hooks/use-toast"
import { Label } from "@vailabel/core"
import { Project } from "@vailabel/core"

interface LabelsState {
  labels: Label[]
  projects: Project[]
  isLoading: boolean
  error: string | null
  searchQuery: string
  selectedProject: string | null
}

interface LabelsActions {
  setSearchQuery: (query: string) => void
  setSelectedProject: (projectId: string | null) => void
  createLabel: (label: Omit<Label, "id">) => Promise<void>
  updateLabel: (labelId: string, updates: Partial<Label>) => Promise<void>
  deleteLabel: (labelId: string) => Promise<void>
  duplicateLabel: (labelId: string) => Promise<void>
  refreshLabels: () => Promise<void>
}

export function useLabelsViewModel(): LabelsState & LabelsActions {
  const services = useServices()
  const { toast } = useToast()

  const [state, setState] = useState<LabelsState>({
    labels: [],
    projects: [],
    isLoading: true,
    error: null,
    searchQuery: "",
    selectedProject: null,
  })

  // Load all labels and projects
  const loadData = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const [projects, allLabels] = await Promise.all([
        services.getProjectService().getProjects(),
        // Get labels from all projects
        Promise.all(
          (await services.getProjectService().getProjects()).map(
            (project: Project) =>
              services.getLabelService().getLabelsByProjectId(project.id)
          )
        ).then((labelArrays) => labelArrays.flat()),
      ])

      setState((prev) => ({
        ...prev,
        labels: allLabels,
        projects,
        isLoading: false,
      }))
    } catch (error) {
      console.error("Failed to load labels data:", error)
      setState((prev) => ({
        ...prev,
        error: "Failed to load labels data",
        isLoading: false,
      }))
    }
  }, [services])

  // Create a new label
  const createLabel = useCallback(
    async (labelData: Omit<Label, "id">) => {
      try {
        const newLabel: Label = {
          ...labelData,
          id: crypto.randomUUID(),
        }

        await services.getLabelService().createLabel(newLabel)

        setState((prev) => ({
          ...prev,
          labels: [...prev.labels, newLabel],
        }))

        toast({
          title: "Label created",
          description: `Label "${newLabel.name}" has been created successfully.`,
        })
      } catch (error) {
        console.error("Failed to create label:", error)
        toast({
          title: "Error",
          description: "Failed to create label",
          variant: "destructive",
        })
      }
    },
    [services, toast]
  )

  // Update an existing label
  const updateLabel = useCallback(
    async (labelId: string, updates: Partial<Label>) => {
      try {
        await services.getLabelService().updateLabel(labelId, updates)

        setState((prev) => ({
          ...prev,
          labels: prev.labels.map((label) =>
            label.id === labelId ? { ...label, ...updates } : label
          ),
        }))

        toast({
          title: "Label updated",
          description: "Label has been updated successfully.",
        })
      } catch (error) {
        console.error("Failed to update label:", error)
        toast({
          title: "Error",
          description: "Failed to update label",
          variant: "destructive",
        })
      }
    },
    [services, toast]
  )

  // Delete a label
  const deleteLabel = useCallback(
    async (labelId: string) => {
      try {
        await services.getLabelService().deleteLabel(labelId)

        setState((prev) => ({
          ...prev,
          labels: prev.labels.filter((label) => label.id !== labelId),
        }))

        toast({
          title: "Label deleted",
          description: "Label has been deleted successfully.",
        })
      } catch (error) {
        console.error("Failed to delete label:", error)
        toast({
          title: "Error",
          description: "Failed to delete label",
          variant: "destructive",
        })
      }
    },
    [services, toast]
  )

  // Duplicate a label
  const duplicateLabel = useCallback(
    async (labelId: string) => {
      try {
        const originalLabel = state.labels.find((label) => label.id === labelId)
        if (!originalLabel) return

        const duplicatedLabel: Label = {
          ...originalLabel,
          id: crypto.randomUUID(),
          name: `${originalLabel.name} (Copy)`,
        }

        await services.getLabelService().createLabel(duplicatedLabel)

        setState((prev) => ({
          ...prev,
          labels: [...prev.labels, duplicatedLabel],
        }))

        toast({
          title: "Label duplicated",
          description: `Label "${duplicatedLabel.name}" has been created.`,
        })
      } catch (error) {
        console.error("Failed to duplicate label:", error)
        toast({
          title: "Error",
          description: "Failed to duplicate label",
          variant: "destructive",
        })
      }
    },
    [services, toast, state.labels]
  )

  // Refresh labels data
  const refreshLabels = useCallback(async () => {
    await loadData()
  }, [loadData])

  // Set search query
  const setSearchQuery = useCallback((query: string) => {
    setState((prev) => ({ ...prev, searchQuery: query }))
  }, [])

  // Set selected project filter
  const setSelectedProject = useCallback((projectId: string | null) => {
    setState((prev) => ({ ...prev, selectedProject: projectId }))
  }, [])

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    ...state,
    setSearchQuery,
    setSelectedProject,
    createLabel,
    updateLabel,
    deleteLabel,
    duplicateLabel,
    refreshLabels,
  }
}
