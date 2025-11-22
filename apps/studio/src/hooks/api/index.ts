/**
 * API Hooks Index
 * Re-exports all API hooks for convenient importing
 */

// Auth hooks
export * from "./auth-hooks"

// Project hooks
export * from "./project-hooks"

// Label hooks
export * from "./label-hooks"

// Image hooks
export * from "./image-hooks"

// Annotation hooks
export * from "./annotation-hooks"

// Task hooks
export * from "./task-hooks"

// AI Model hooks
export * from "./ai-model-hooks"

// Settings hooks
export * from "./settings-hooks"

// History hooks
export * from "./history-hooks"

// Sync hooks
export * from "./sync-hooks"

// Permission hooks
export * from "./permission-hooks"

// Role hooks
export * from "./role-hooks"

// User permission hooks
export * from "./user-permission-hooks"

// User hooks
export * from "./user-hooks"

// Utility hooks
export * from "./utility-hooks"

// Export query keys and api client
export { queryKeys, apiClient } from "../api-client-config"
