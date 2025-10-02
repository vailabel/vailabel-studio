/**
 * Labels ViewModel
 * Manages labels state and operations using React Query
 * Follows MVVM pattern with React Query as the binding layer
 */

import { useState, useMemo } from "react"
import { useMutation, useQueryClient } from "react-query"
import {
  useLabels,
  useCreateLabel,
  useUpdateLabel,
  useDeleteLabel,
} from "@/hooks/useFastAPIQuery"
import { Label } from "@vailabel/core"

export const useLabelsViewModel = (projectId?: string) => {
  const queryClient = useQueryClient()

  // State
  const [searchQuery, setSearchQueryState] = useState("")
  const [selectedLabels, setSelectedLabels] = useState<string[]>([])
  const [selectedProject, setSelectedProjectState] = useState<string | null>(
    null
  )
  const [sortBy, setSortBy] = useState<"name" | "createdAt" | "usage">("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  // Queries
  const {
    data: labels = [],
    isLoading,
    error,
    refetch,
  } = useLabels(projectId || "")

  // Mutations
  const createLabelMutation = useCreateLabel()
  const updateLabelMutation = useUpdateLabel()
  const deleteLabelMutation = useDeleteLabel()

  // Computed values
  const filteredAndSortedLabels = useMemo(() => {
    let filtered = labels

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (label) =>
          label.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          label.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case "createdAt":
          aValue = new Date(a.createdAt)
          bValue = new Date(b.createdAt)
          break
        case "usage":
          // This would require annotation data to calculate usage
          aValue = 0
          bValue = 0
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1
      return 0
    })

    return filtered
  }, [labels, searchQuery, sortBy, sortOrder])

  const selectedLabelsData = useMemo(() => {
    return labels.filter((label) => selectedLabels.includes(label.id))
  }, [labels, selectedLabels])

  const labelCategories = useMemo(() => {
    const categories = new Set(
      labels.map((label) => label.category).filter(Boolean)
    )
    return Array.from(categories)
  }, [labels])

  // Actions
  const updateSearchQuery = (query: string) => {
    setSearchQueryState(query)
  }

  const setSearchQuery = (query: string) => {
    setSearchQueryState(query)
  }

  const setSelectedProject = (projectId: string | null) => {
    setSelectedProjectState(projectId)
  }

  const updateSorting = (
    by: "name" | "createdAt" | "usage",
    order: "asc" | "desc"
  ) => {
    setSortBy(by)
    setSortOrder(order)
  }

  const toggleLabelSelection = (labelId: string) => {
    setSelectedLabels((prev) =>
      prev.includes(labelId)
        ? prev.filter((id) => id !== labelId)
        : [...prev, labelId]
    )
  }

  const selectAllLabels = () => {
    setSelectedLabels(filteredAndSortedLabels.map((label) => label.id))
  }

  const clearSelection = () => {
    setSelectedLabels([])
  }

  const createLabel = async (labelData: Omit<Label, "id">) => {
    try {
      const result = await createLabelMutation.mutateAsync(labelData)
      return result
    } catch (error) {
      console.error("Failed to create label:", error)
      throw error
    }
  }

  const updateLabel = async (labelId: string, updates: Partial<Label>) => {
    try {
      await updateLabelMutation.mutateAsync({
        id: labelId,
        updates,
      })
    } catch (error) {
      console.error("Failed to update label:", error)
      throw error
    }
  }

  const deleteLabel = async (labelId: string) => {
    try {
      await deleteLabelMutation.mutateAsync(labelId)
      // Remove from selection if it was selected
      setSelectedLabels((prev) => prev.filter((id) => id !== labelId))
    } catch (error) {
      console.error("Failed to delete label:", error)
      throw error
    }
  }

  const deleteSelectedLabels = async () => {
    try {
      const promises = selectedLabels.map((labelId) =>
        deleteLabelMutation.mutateAsync(labelId)
      )
      await Promise.all(promises)
      clearSelection()
    } catch (error) {
      console.error("Failed to delete selected labels:", error)
      throw error
    }
  }

  const duplicateLabel = async (label: Label) => {
    try {
      const duplicateData = {
        name: `${label.name} (Copy)`,
        description: label.description,
        color: label.color,
        category: label.category,
        project_id: label.project_id,
      }

      const result = await createLabelMutation.mutateAsync(duplicateData)
      return result
    } catch (error) {
      console.error("Failed to duplicate label:", error)
      throw error
    }
  }

  const exportLabels = () => {
    const exportData = {
      labels: selectedLabelsData.length > 0 ? selectedLabelsData : labels,
      exportedAt: new Date().toISOString(),
      projectId,
    }

    const dataStr = JSON.stringify(exportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })

    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `labels-export.json`
    link.click()

    URL.revokeObjectURL(url)
  }

  const importLabels = async (file: File) => {
    try {
      const text = await file.text()
      const importData = JSON.parse(text)

      if (!importData.labels || !Array.isArray(importData.labels)) {
        throw new Error("Invalid labels file format")
      }

      const promises = importData.labels.map((labelData: any) =>
        createLabelMutation.mutateAsync({
          ...labelData,
          project_id: projectId,
        })
      )

      await Promise.all(promises)
    } catch (error) {
      console.error("Failed to import labels:", error)
      throw error
    }
  }

  const refreshLabels = () => {
    refetch()
  }

  const getLabelColor = (label: Label) => {
    return label.color || "#3B82F6"
  }

  const getLabelIcon = (label: Label) => {
    // This could be based on label category or type
    return "tag"
  }

  // Mock projects data expected by the page
  const projects = useMemo(
    () => [
      { id: "1", name: "Project Alpha" },
      { id: "2", name: "Project Beta" },
      { id: "3", name: "Project Gamma" },
    ],
    []
  )

  const duplicateLabelAction = async (labelId: string) => {
    try {
      const label = labels.find((l) => l.id === labelId)
      if (!label) throw new Error("Label not found")

      const duplicateData = {
        name: `${label.name} (Copy)`,
        description: label.description,
        color: label.color,
        category: label.category,
        project_id: label.project_id,
      }

      const result = await createLabelMutation.mutateAsync(duplicateData)
      return result
    } catch (error) {
      console.error("Failed to duplicate label:", error)
      throw error
    }
  }

  return {
    // State
    labels: filteredAndSortedLabels,
    allLabels: labels,
    selectedLabels,
    selectedLabelsData,
    searchQuery,
    selectedProject,
    sortBy,
    sortOrder,
    labelCategories,
    projects,
    isLoading,
    error,

    // Actions
    updateSearchQuery,
    setSearchQuery,
    setSelectedProject,
    updateSorting,
    toggleLabelSelection,
    selectAllLabels,
    clearSelection,
    createLabel,
    updateLabel,
    deleteLabel,
    deleteSelectedLabels,
    duplicateLabel: duplicateLabelAction,
    exportLabels,
    importLabels,
    refreshLabels,
    getLabelColor,
    getLabelIcon,

    // Mutation state
    createLabelMutation,
    updateLabelMutation,
    deleteLabelMutation,
  }
}
