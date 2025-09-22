import { z } from "zod"

// Enhanced AI Model schemas with comprehensive validation
export const aiModelSchema = z.object({
  id: z.string().min(1, "ID is required"),
  name: z
    .string()
    .min(1, "Model name is required")
    .max(100, "Model name must be less than 100 characters")
    .regex(/^[a-zA-Z0-9\s\-_.]+$/, "Model name can only contain letters, numbers, spaces, hyphens, underscores, and dots"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description must be less than 500 characters"),
  version: z
    .string()
    .min(1, "Version is required")
    .regex(/^\d+\.\d+(\.\d+)?(-[a-zA-Z0-9]+)?$/, "Version must follow semantic versioning (e.g., 1.0.0, 2.1.0-beta)"),
  modelPath: z
    .string()
    .min(1, "Model path is required")
    .refine(
      (path) => {
        const validExtensions = ['.pt', '.pth', '.onnx', '.tflite', '.h5', '.pb']
        return validExtensions.some(ext => path.toLowerCase().endsWith(ext))
      },
      "Model path must have a valid extension (.pt, .pth, .onnx, .tflite, .h5, .pb)"
    ),
  configPath: z
    .string()
    .optional()
    .refine(
      (path) => {
        if (!path) return true
        const validExtensions = ['.json', '.yaml', '.yml', '.cfg', '.ini']
        return validExtensions.some(ext => path.toLowerCase().endsWith(ext))
      },
      "Config path must have a valid extension (.json, .yaml, .yml, .cfg, .ini)"
    ),
  modelSize: z
    .number()
    .min(0, "Model size must be non-negative")
    .max(10 * 1024 * 1024 * 1024, "Model size cannot exceed 10GB"), // 10GB limit
  isCustom: z.boolean().default(false),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
})

// Form data schema for creating/editing models
export const aiModelFormSchema = z.object({
  name: z
    .string()
    .min(1, "Model name is required")
    .max(100, "Model name must be less than 100 characters")
    .regex(/^[a-zA-Z0-9\s\-_.]+$/, "Model name can only contain letters, numbers, spaces, hyphens, underscores, and dots"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description must be less than 500 characters"),
  version: z
    .string()
    .min(1, "Version is required")
    .regex(/^\d+\.\d+(\.\d+)?(-[a-zA-Z0-9]+)?$/, "Version must follow semantic versioning (e.g., 1.0.0, 2.1.0-beta)"),
  modelFile: z
    .instanceof(File)
    .refine(
      (file) => {
        const validExtensions = ['.pt', '.pth', '.onnx', '.tflite', '.h5', '.pb']
        return validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
      },
      "Please select a valid model file (.pt, .pth, .onnx, .tflite, .h5, .pb)"
    )
    .refine(
      (file) => file.size <= 10 * 1024 * 1024 * 1024, // 10GB limit
      "Model file size cannot exceed 10GB"
    ),
  configFile: z
    .instanceof(File)
    .optional()
    .refine(
      (file) => {
        if (!file) return true
        const validExtensions = ['.json', '.yaml', '.yml', '.cfg', '.ini']
        return validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
      },
      "Config file must have a valid extension (.json, .yaml, .yml, .cfg, .ini)"
    ),
})

// System model schema for predefined models
export const systemModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.enum(["segmentation", "detection", "classification", "tracking", "pose"]),
  variants: z.array(z.object({
    name: z.string(),
    downloadUrl: z.string().url(),
    size: z.number().optional(),
    accuracy: z.number().min(0).max(100).optional(),
    speed: z.enum(["fast", "medium", "slow"]).optional(),
  })).optional(),
  downloadUrl: z.string().url().optional(),
  size: z.number().optional(),
  accuracy: z.number().min(0).max(100).optional(),
  speed: z.enum(["fast", "medium", "slow"]).optional(),
  requirements: z.object({
    minMemory: z.number().optional(), // in MB
    recommendedMemory: z.number().optional(), // in MB
    gpuRequired: z.boolean().default(false),
    cudaVersion: z.string().optional(),
  }).optional(),
})

// Model performance metrics schema
export const modelMetricsSchema = z.object({
  accuracy: z.number().min(0).max(100).optional(),
  precision: z.number().min(0).max(1).optional(),
  recall: z.number().min(0).max(1).optional(),
  f1Score: z.number().min(0).max(1).optional(),
  inferenceTime: z.number().min(0).optional(), // in milliseconds
  memoryUsage: z.number().min(0).optional(), // in MB
  lastTested: z.date().optional(),
})

// Type definitions
export type AIModel = z.infer<typeof aiModelSchema>
export type AIModelFormData = z.infer<typeof aiModelFormSchema>
export type SystemModel = z.infer<typeof systemModelSchema>
export type ModelMetrics = z.infer<typeof modelMetricsSchema>

export type ModelCategory = "segmentation" | "detection" | "classification" | "tracking" | "pose"
export type ModelSpeed = "fast" | "medium" | "slow"

// Enhanced AI Model with additional fields
export type EnhancedAIModel = AIModel & {
  metrics?: ModelMetrics
  category?: ModelCategory
  isActive?: boolean
  isDownloading?: boolean
  downloadProgress?: number
  lastUsed?: Date
  usageCount?: number
}
