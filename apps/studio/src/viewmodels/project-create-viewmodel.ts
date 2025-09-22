import { useState, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"
import { useNavigate } from "react-router-dom"
import { useServices } from "@/services/ServiceProvider"
import type { Project, ImageData } from "@vailabel/core"
import { z, ZodError } from "zod"

// Validation schemas
export const ProjectDetailSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100, "Project name too long"),
  description: z.string().max(500, "Description too long").optional(),
  labels: z
    .array(
      z.object({
        name: z.string().min(1, "Label name required").max(50, "Label name too long"),
        color: z.string().min(1, "Color required"),
      })
    )
    .min(1, "At least one label required")
    .max(20, "Too many labels"),
})

export type ProjectDetailForm = z.infer<typeof ProjectDetailSchema>

export interface ProjectCreateState {
  // Form state
  step: "details" | "dataset"
  isUploading: boolean
  isCreating: boolean
  
  // Data state
  images: ImageData[]
  labelInput: string
  labelColor: string
  showColorPicker: boolean
  
  // UI state
  errors: Record<string, string>
}

export interface ProjectCreateActions {
  // Navigation
  setStep: (step: "details" | "dataset") => void
  goToNextStep: () => void
  goToPreviousStep: () => void
  
  // Image handling
  handleFiles: (files: File[]) => Promise<void>
  handleDragOver: (e: React.DragEvent) => void
  handleDrop: (e: React.DragEvent) => void
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleRemoveImage: (index: number) => void
  
  // Label handling
  addLabel: () => void
  removeLabel: (index: number) => void
  setLabelInput: (input: string) => void
  setLabelColor: (color: string) => void
  setShowColorPicker: (show: boolean) => void
  
  // Project creation
  createProject: (formData: ProjectDetailForm) => Promise<void>
  
  // Validation
  validateForm: (formData: Partial<ProjectDetailForm>) => Record<string, string>
}

export function useProjectCreateViewModel(): ProjectCreateState & ProjectCreateActions {
  const { toast } = useToast()
  const navigate = useNavigate()
  const services = useServices()

  // State
  const [state, setState] = useState<ProjectCreateState>({
    step: "details",
    isUploading: false,
    isCreating: false,
    images: [],
    labelInput: "",
    labelColor: "#3b82f6",
    showColorPicker: false,
    errors: {},
  })

  // Actions
  const setStep = useCallback((step: "details" | "dataset") => {
    setState(prev => ({ ...prev, step }))
  }, [])

  const goToNextStep = useCallback(() => {
    setState(prev => ({ ...prev, step: "dataset" }))
  }, [])

  const goToPreviousStep = useCallback(() => {
    setState(prev => ({ ...prev, step: "details" }))
  }, [])

  const validateForm = useCallback((formData: Partial<ProjectDetailForm>): Record<string, string> => {
    try {
      ProjectDetailSchema.parse(formData)
      return {}
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string> = {}
        error.issues.forEach((err: z.ZodIssue) => {
          const path = err.path.join('.')
          errors[path] = err.message
        })
        return errors
      }
      return { general: "Validation failed" }
    }
  }, [])

  const readFileAsDataURL = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }, [])

  const getImageDimensions = useCallback((
    dataUrl: string
  ): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
        })
      }
      img.src = dataUrl
    })
  }, [])

  const handleFiles = useCallback(async (files: File[]) => {
    setState(prev => ({ ...prev, isUploading: true }))

    try {
      const imageFiles = files.filter((file) => file.type.startsWith("image/"))

      if (imageFiles.length === 0) {
        toast({
          title: "No images found",
          description: "Please select image files (PNG, JPG, etc.)",
          variant: "destructive",
        })
        return
      }

      const newImages: ImageData[] = []

      for (const file of imageFiles) {
        const imageData = await readFileAsDataURL(file)
        const dimensions = await getImageDimensions(imageData)

        newImages.push({
          id: crypto.randomUUID(),
          name: file.name,
          data: imageData,
          width: dimensions.width,
          height: dimensions.height,
          annotations: [],
        })
      }

      setState(prev => ({
        ...prev,
        images: [...prev.images, ...newImages],
        isUploading: false,
      }))

      toast({
        title: "Images added",
        description: `${newImages.length} images have been added to the project.`,
      })
    } catch (error) {
      console.error("Error processing files:", error)
      toast({
        title: "Error",
        description: "Failed to process image files",
        variant: "destructive",
      })
      setState(prev => ({ ...prev, isUploading: false }))
    }
  }, [toast, readFileAsDataURL, getImageDimensions])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files) {
      handleFiles(Array.from(e.dataTransfer.files))
    }
  }, [handleFiles])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files))
    }
  }, [handleFiles])

  const handleRemoveImage = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }))
  }, [])

  const addLabel = useCallback(() => {
    if (!state.labelInput.trim()) return
    
    const newLabel = {
      name: state.labelInput.trim(),
      color: state.labelColor,
    }
    
    setState(prev => ({
      ...prev,
      labelInput: "",
      labelColor: "#3b82f6",
    }))
    
    return newLabel
  }, [state.labelInput, state.labelColor])

  const removeLabel = useCallback(() => {
    // This function is used by the component to remove labels from the form
    // The actual removal logic is handled in the component
  }, [])

  const setLabelInput = useCallback((input: string) => {
    setState(prev => ({ ...prev, labelInput: input }))
  }, [])

  const setLabelColor = useCallback((color: string) => {
    setState(prev => ({ ...prev, labelColor: color }))
  }, [])

  const setShowColorPicker = useCallback((show: boolean) => {
    setState(prev => ({ ...prev, showColorPicker: show }))
  }, [])

  const createProjectAction = useCallback(async (formData: ProjectDetailForm) => {
    if (state.images.length === 0) {
      toast({
        title: "No images",
        description: "Please add at least one image to your project",
        variant: "destructive",
      })
      return
    }

    setState(prev => ({ ...prev, isCreating: true }))

    try {
      const projectId = crypto.randomUUID()
      const newProject: Project = {
        id: projectId,
        name: formData.name.trim(),
        images: [],
      }

      await services.getProjectService().createProject(newProject)

      // Save labels
      for (const label of formData.labels) {
        await services.getLabelService().createLabel({
          id: crypto.randomUUID(),
          name: label.name,
          color: label.color,
          projectId,
        })
      }

      // Save images
      for (const image of state.images) {
        await services.getImageDataService().createImage({
          ...image,
          projectId,
        })
      }

      toast({
        title: "Project created",
        description: "Your project, labels, and images have been saved successfully.",
      })

      navigate("/projects")
    } catch (error) {
      console.error("Failed to create project:", error)
      toast({
        title: "Error",
        description: "Failed to create project, labels, or images",
        variant: "destructive",
      })
    } finally {
      setState(prev => ({ ...prev, isCreating: false }))
    }
  }, [state.images, toast, navigate])

  return {
    ...state,
    setStep,
    goToNextStep,
    goToPreviousStep,
    handleFiles,
    handleDragOver,
    handleDrop,
    handleFileChange,
    handleRemoveImage,
    addLabel,
    removeLabel,
    setLabelInput,
    setLabelColor,
    setShowColorPicker,
    createProject: createProjectAction,
    validateForm,
  }
}
