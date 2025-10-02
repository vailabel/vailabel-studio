/**
 * Project Create ViewModel
 * Manages project creation state and operations using React Query
 * Follows MVVM pattern with React Query as the binding layer
 */

import { useState } from "react"
import { useMutation, useQueryClient } from "react-query"
import { useCreateProject } from "@/hooks/useFastAPIQuery"
import { Project } from "@vailabel/core"
import { z } from "zod"

// Schema for project creation
export const ProjectDetailSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(100, "Project name must be less than 100 characters"),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional(),
  type: z.string().min(1, "Project type is required"),
  settings: z.record(z.any()).optional(),
})

export type ProjectDetailForm = z.infer<typeof ProjectDetailSchema>

interface ProjectFormData {
  name: string
  description: string
  type: string
  settings: Record<string, any>
}

export const useProjectCreateViewModel = () => {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<ProjectFormData>({
    name: "",
    description: "",
    type: "image_annotation",
    settings: {},
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isValid, setIsValid] = useState(false)

  // Mutations
  const createProjectMutation = useCreateProject()

  // Form validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Project name is required"
    } else if (formData.name.length < 3) {
      newErrors.name = "Project name must be at least 3 characters"
    } else if (formData.name.length > 100) {
      newErrors.name = "Project name must be less than 100 characters"
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = "Description must be less than 500 characters"
    }

    setErrors(newErrors)
    const valid = Object.keys(newErrors).length === 0
    setIsValid(valid)
    return valid
  }

  // Form actions
  const updateFormData = (updates: Partial<ProjectFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
    // Clear errors for updated fields
    const newErrors = { ...errors }
    Object.keys(updates).forEach((key) => {
      delete newErrors[key]
    })
    setErrors(newErrors)
  }

  const updateFormField = (field: keyof ProjectFormData, value: any) => {
    updateFormData({ [field]: value })
  }

  const updateSettings = (key: string, value: any) => {
    updateFormData({
      settings: {
        ...formData.settings,
        [key]: value,
      },
    })
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      type: "image_annotation",
      settings: {},
    })
    setErrors({})
    setIsValid(false)
  }

  // Project creation
  const createProject = async () => {
    if (!validateForm()) {
      throw new Error("Form validation failed")
    }

    try {
      const projectData: Omit<Project, "id"> = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        type: formData.type,
        settings: formData.settings,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "active",
        metadata: {},
      }

      const result = await createProjectMutation.mutateAsync(projectData)
      return result
    } catch (error) {
      console.error("Failed to create project:", error)
      throw error
    }
  }

  const createProjectAndRedirect = async (navigate: (path: string) => void) => {
    try {
      const project = await createProject()
      navigate(`/projects/detail/${project.id}`)
    } catch (error) {
      console.error("Failed to create project and redirect:", error)
      throw error
    }
  }

  // Template functions
  const applyTemplate = (template: string) => {
    const templates = {
      image_annotation: {
        type: "image_annotation",
        settings: {
          annotationTypes: ["bbox", "polygon", "point"],
          autoSave: true,
          showGrid: false,
          gridSize: 20,
        },
      },
      object_detection: {
        type: "object_detection",
        settings: {
          annotationTypes: ["bbox"],
          autoSave: true,
          showGrid: true,
          gridSize: 10,
        },
      },
      segmentation: {
        type: "segmentation",
        settings: {
          annotationTypes: ["polygon", "mask"],
          autoSave: true,
          showGrid: false,
          gridSize: 20,
        },
      },
    }

    const templateData = templates[template as keyof typeof templates]
    if (templateData) {
      updateFormData(templateData)
    }
  }

  return {
    // State
    formData,
    errors,
    isValid,
    isLoading: createProjectMutation.isLoading,
    error: createProjectMutation.error,

    // Form actions
    updateFormData,
    updateFormField,
    updateSettings,
    resetForm,
    validateForm,

    // Project creation
    createProject,
    createProjectAndRedirect,

    // Templates
    applyTemplate,

    // Mutation state
    createProjectMutation,
  }
}
