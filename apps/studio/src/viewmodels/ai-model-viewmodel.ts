import { useState, useCallback, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { AIModel, EnhancedAIModel, SystemModel, AIModelFormData } from "@/lib/schemas/ai-model"

export interface AIModelViewModel {
  // State
  models: EnhancedAIModel[]
  systemModels: SystemModel[]
  isLoading: boolean
  isUploading: boolean
  error: string | null
  activeModel: EnhancedAIModel | null
  
  // Actions
  loadModels: () => Promise<void>
  loadSystemModels: () => Promise<void>
  createModel: (formData: AIModelFormData) => Promise<void>
  updateModel: (id: string, updates: Partial<AIModel>) => Promise<void>
  deleteModel: (id: string) => Promise<void>
  downloadSystemModel: (modelId: string, variant?: string) => Promise<void>
  setActiveModel: (id: string) => Promise<void>
  testModel: (id: string) => Promise<boolean>
  
  // Computed
  modelsByCategory: Record<string, EnhancedAIModel[]>
  customModels: EnhancedAIModel[]
  systemModelsByCategory: Record<string, SystemModel[]>
  totalModelsCount: number
  totalModelSize: number
}

// Predefined system models
const SYSTEM_MODELS: SystemModel[] = [
  {
    id: "segment-anything-2.0",
    name: "Segment Anything 2.0",
    description: "State-of-the-art segmentation model for any object with improved accuracy and speed.",
    category: "segmentation",
    variants: [
      {
        name: "sam2.1_hiera_tiny.pt",
        downloadUrl: "https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_tiny.pt",
        size: 45 * 1024 * 1024, // 45MB
        accuracy: 85,
        speed: "fast",
      },
      {
        name: "sam2.1_hiera_small.pt",
        downloadUrl: "https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_small.pt",
        size: 95 * 1024 * 1024, // 95MB
        accuracy: 88,
        speed: "fast",
      },
      {
        name: "sam2.1_hiera_base_plus.pt",
        downloadUrl: "https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_base_plus.pt",
        size: 180 * 1024 * 1024, // 180MB
        accuracy: 91,
        speed: "medium",
      },
      {
        name: "sam2.1_hiera_large.pt",
        downloadUrl: "https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_large.pt",
        size: 350 * 1024 * 1024, // 350MB
        accuracy: 93,
        speed: "slow",
      },
    ],
    requirements: {
      minMemory: 1024, // 1GB
      recommendedMemory: 2048, // 2GB
      gpuRequired: false,
    },
  },
  {
    id: "yolo-v8",
    name: "YOLO v8",
    description: "You Only Look Once - real-time object detection with state-of-the-art accuracy.",
    category: "detection",
    variants: [
      {
        name: "yolov8n.pt",
        downloadUrl: "https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.pt",
        size: 6 * 1024 * 1024, // 6MB
        accuracy: 78,
        speed: "fast",
      },
      {
        name: "yolov8s.pt",
        downloadUrl: "https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8s.pt",
        size: 22 * 1024 * 1024, // 22MB
        accuracy: 82,
        speed: "fast",
      },
      {
        name: "yolov8m.pt",
        downloadUrl: "https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8m.pt",
        size: 50 * 1024 * 1024, // 50MB
        accuracy: 85,
        speed: "medium",
      },
      {
        name: "yolov8l.pt",
        downloadUrl: "https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8l.pt",
        size: 87 * 1024 * 1024, // 87MB
        accuracy: 87,
        speed: "medium",
      },
      {
        name: "yolov8x.pt",
        downloadUrl: "https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8x.pt",
        size: 136 * 1024 * 1024, // 136MB
        accuracy: 89,
        speed: "slow",
      },
    ],
    requirements: {
      minMemory: 512, // 512MB
      recommendedMemory: 1024, // 1GB
      gpuRequired: false,
    },
  },
  {
    id: "pose-estimation",
    name: "Human Pose Estimation",
    description: "Detect and estimate human poses in images with high accuracy.",
    category: "pose",
    downloadUrl: "https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n-pose.pt",
    size: 12 * 1024 * 1024, // 12MB
    accuracy: 88,
    speed: "fast",
    requirements: {
      minMemory: 512, // 512MB
      recommendedMemory: 1024, // 1GB
      gpuRequired: false,
    },
  },
  {
    id: "transformer-tracking",
    name: "TransT",
    description: "Transformer-based visual tracking model for object tracking.",
    category: "tracking",
    downloadUrl: "#", // Placeholder
    size: 50 * 1024 * 1024, // 50MB
    accuracy: 85,
    speed: "medium",
    requirements: {
      minMemory: 1024, // 1GB
      recommendedMemory: 2048, // 2GB
      gpuRequired: true,
      cudaVersion: "11.0+",
    },
  },
]

export function useAIModelViewModel(): AIModelViewModel {
  const [models, setModels] = useState<EnhancedAIModel[]>([])
  const [systemModels] = useState<SystemModel[]>(SYSTEM_MODELS)
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeModel, setActiveModel] = useState<EnhancedAIModel | null>(null)
  const { toast } = useToast()

  // Load user models
  const loadModels = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // This would typically call the service layer
      // For now, we'll simulate loading models
      const mockModels: EnhancedAIModel[] = [
        {
          id: "1",
          name: "Custom Segmentation Model",
          description: "A custom trained segmentation model for specific use cases",
          version: "1.0.0",
          modelPath: "/path/to/model.pt",
          configPath: "/path/to/config.json",
          modelSize: 150 * 1024 * 1024, // 150MB
          isCustom: true,
          category: "segmentation",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          metrics: {
            accuracy: 92,
            precision: 0.89,
            recall: 0.91,
            f1Score: 0.90,
            inferenceTime: 45,
            memoryUsage: 512,
            lastTested: new Date(),
          },
          lastUsed: new Date(),
          usageCount: 15,
        },
      ]
      
      setModels(mockModels)
      
      // Set active model if none is set
      if (!activeModel && mockModels.length > 0) {
        const active = mockModels.find(m => m.isActive)
        if (active) {
          setActiveModel(active)
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load AI models"
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [activeModel, toast])

  // Load system models (static for now)
  const loadSystemModels = useCallback(async () => {
    // System models are already loaded from the constant
    // In a real implementation, this might fetch from an API
  }, [])

  // Create a new model
  const createModel = useCallback(async (formData: AIModelFormData) => {
    setIsUploading(true)
    
    try {
      const newModel: EnhancedAIModel = {
        id: crypto.randomUUID(),
        name: formData.name,
        description: formData.description,
        version: formData.version,
        modelPath: formData.modelFile.name,
        configPath: formData.configFile?.name || "",
        modelSize: formData.modelFile.size,
        isCustom: true,
        category: "segmentation", // Default category
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0,
      }
      
      // In a real implementation, this would upload the file and save the model
      setModels(prev => [...prev, newModel])
      
      toast({
        title: "Success",
        description: "AI model uploaded successfully",
        variant: "default",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to upload model"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    } finally {
      setIsUploading(false)
    }
  }, [toast])

  // Update a model
  const updateModel = useCallback(async (id: string, updates: Partial<AIModel>) => {
    try {
      setModels(prev => prev.map(model => 
        model.id === id 
          ? { ...model, ...updates, updatedAt: new Date() }
          : model
      ))
      
      toast({
        title: "Success",
        description: "Model updated successfully",
        variant: "default",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update model"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    }
  }, [toast])

  // Delete a model
  const deleteModel = useCallback(async (id: string) => {
    try {
      setModels(prev => prev.filter(model => model.id !== id))
      
      // If the deleted model was active, set another model as active
      if (activeModel?.id === id) {
        const remainingModels = models.filter(m => m.id !== id)
        if (remainingModels.length > 0) {
          setActiveModel(remainingModels[0])
        } else {
          setActiveModel(null)
        }
      }
      
      toast({
        title: "Deleted",
        description: "Model deleted successfully",
        variant: "default",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete model"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    }
  }, [activeModel, models, toast])

  // Download system model
  const downloadSystemModel = useCallback(async (modelId: string, variant?: string) => {
    try {
      const systemModel = systemModels.find(m => m.id === modelId)
      if (!systemModel) {
        throw new Error("System model not found")
      }
      
      const downloadUrl = variant 
        ? systemModel.variants?.find(v => v.name === variant)?.downloadUrl
        : systemModel.downloadUrl
      
      if (!downloadUrl) {
        throw new Error("Download URL not available")
      }
      
      // Open download URL
      window.open(downloadUrl, "_blank")
      
      toast({
        title: "Download Started",
        description: `Downloading ${systemModel.name}...`,
        variant: "default",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to download model"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    }
  }, [systemModels, toast])

  // Set active model
  const setActiveModelById = useCallback(async (id: string) => {
    try {
      const model = models.find(m => m.id === id)
      if (!model) {
        throw new Error("Model not found")
      }
      
      // Update all models to set only the selected one as active
      setModels(prev => prev.map(m => ({
        ...m,
        isActive: m.id === id
      })))
      
      setActiveModel(model)
      
      toast({
        title: "Model Activated",
        description: `${model.name} is now the active model`,
        variant: "default",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to set active model"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    }
  }, [models, toast])

  // Test model
  const testModel = useCallback(async (id: string): Promise<boolean> => {
    try {
      const model = models.find(m => m.id === id)
      if (!model) {
        throw new Error("Model not found")
      }
      
      // Simulate model testing
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Simulate test results
      const isWorking = Math.random() > 0.2 // 80% success rate
      
      if (isWorking) {
        toast({
          title: "Test Successful",
          description: `${model.name} is working correctly`,
          variant: "default",
        })
      } else {
        toast({
          title: "Test Failed",
          description: `${model.name} failed the test`,
          variant: "destructive",
        })
      }
      
      return isWorking
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to test model"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      return false
    }
  }, [models, toast])

  // Computed values
  const modelsByCategory = models.reduce((acc, model) => {
    const category = model.category || "uncategorized"
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(model)
    return acc
  }, {} as Record<string, EnhancedAIModel[]>)

  const customModels = models.filter(model => model.isCustom)

  const systemModelsByCategory = systemModels.reduce((acc, model) => {
    if (!acc[model.category]) {
      acc[model.category] = []
    }
    acc[model.category].push(model)
    return acc
  }, {} as Record<string, SystemModel[]>)

  const totalModelsCount = models.length
  const totalModelSize = models.reduce((total, model) => total + model.modelSize, 0)

  // Load models on mount
  useEffect(() => {
    loadModels()
    loadSystemModels()
  }, [loadModels, loadSystemModels])

  return {
    models,
    systemModels,
    isLoading,
    isUploading,
    error,
    activeModel,
    loadModels,
    loadSystemModels,
    createModel,
    updateModel,
    deleteModel,
    downloadSystemModel,
    setActiveModel: setActiveModelById,
    testModel,
    modelsByCategory,
    customModels,
    systemModelsByCategory,
    totalModelsCount,
    totalModelSize,
  }
}
