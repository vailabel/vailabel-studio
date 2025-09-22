import { z } from "zod"

// Enhanced Zod schemas with better validation
export const awsConfigSchema = z.object({
  accessKeyId: z
    .string()
    .min(1, "Access Key ID is required")
    .regex(/^AKIA[0-9A-Z]{16}$/, "Invalid AWS Access Key ID format"),
  secretAccessKey: z
    .string()
    .min(1, "Secret Access Key is required")
    .min(20, "Secret Access Key must be at least 20 characters"),
  bucket: z
    .string()
    .min(1, "Bucket name is required")
    .regex(/^[a-z0-9.-]+$/, "Bucket name can only contain lowercase letters, numbers, dots, and hyphens")
    .refine(
      (val) => !val.startsWith(".") && !val.endsWith("."),
      "Bucket name cannot start or end with a dot"
    ),
  region: z
    .string()
    .min(1, "Region is required")
    .regex(/^[a-z0-9-]+$/, "Invalid region format"),
})

export const azureConfigSchema = z.object({
  accountName: z
    .string()
    .min(1, "Account name is required")
    .regex(/^[a-z0-9]+$/, "Account name can only contain lowercase letters and numbers")
    .min(3, "Account name must be at least 3 characters")
    .max(24, "Account name must be at most 24 characters"),
  accountKey: z
    .string()
    .min(1, "Account key is required")
    .min(32, "Account key must be at least 32 characters"),
  container: z
    .string()
    .min(1, "Container name is required")
    .regex(/^[a-z0-9-]+$/, "Container name can only contain lowercase letters, numbers, and hyphens")
    .refine(
      (val) => !val.startsWith("-") && !val.endsWith("-"),
      "Container name cannot start or end with a hyphen"
    ),
})

export const gcpConfigSchema = z.object({
  serviceAccountJson: z
    .string()
    .min(1, "Service Account JSON is required")
    .refine(
      (val) => {
        try {
          const parsed = JSON.parse(val)
          return parsed.type === "service_account" && parsed.project_id
        } catch {
          return false
        }
      },
      "Invalid service account JSON format"
    ),
  bucket: z
    .string()
    .min(1, "Bucket name is required")
    .regex(/^[a-z0-9.-]+$/, "Bucket name can only contain lowercase letters, numbers, dots, and hyphens")
    .refine(
      (val) => !val.startsWith(".") && !val.endsWith("."),
      "Bucket name cannot start or end with a dot"
    ),
})

// Type definitions
export type AWSConfig = z.infer<typeof awsConfigSchema>
export type AzureConfig = z.infer<typeof azureConfigSchema>
export type GCPConfig = z.infer<typeof gcpConfigSchema>

export type CloudProvider = "aws" | "azure" | "gcp"

export type CloudStorageConfig =
  | {
      id: string
      name: string
      provider: "aws"
      config: AWSConfig
      isActive: boolean
      createdAt: Date
      updatedAt: Date
    }
  | {
      id: string
      name: string
      provider: "azure"
      config: AzureConfig
      isActive: boolean
      createdAt: Date
      updatedAt: Date
    }
  | {
      id: string
      name: string
      provider: "gcp"
      config: GCPConfig
      isActive: boolean
      createdAt: Date
      updatedAt: Date
    }

// Form data types
export type CloudConfigFormData = {
  name: string
  provider: CloudProvider
  config: AWSConfig | AzureConfig | GCPConfig
}
