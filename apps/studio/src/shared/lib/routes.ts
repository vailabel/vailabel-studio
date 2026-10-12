import type { ComponentType } from "react"

/**
 * A route a feature contributes to the app. Features export an array of these
 * from their `index.ts`; the app router composes them. `load` must be a
 * dynamic import so every page stays in its own chunk.
 */
export interface FeatureRoute {
  path: string
  load: () => Promise<{ default: ComponentType }>
  /** "shell" (default) renders inside the sidebar layout; "bare" owns the window. */
  layout?: "shell" | "bare"
}

/**
 * Single source of truth for URLs. `routePatterns` feed the router; `paths`
 * build concrete links. Never hand-write a route string elsewhere — a renamed
 * route should be a one-line change here.
 */
export const routePatterns = {
  overview: "/",
  projects: "/projects",
  projectCreate: "/projects/create",
  projectDetail: "/projects/detail/:projectId",
  projectTraining: "/projects/train/:projectId",
  studio: "/projects/:projectId/studio",
  studioItem: "/projects/:projectId/studio/:itemId",
  aiModels: "/ai-models",
  datasetIntelligence: "/dataset-intelligence",
  labels: "/labels",
  settings: "/settings",
} as const

export const paths = {
  overview: routePatterns.overview,
  projects: routePatterns.projects,
  projectCreate: routePatterns.projectCreate,
  projectDetail: (projectId: string) => `/projects/detail/${projectId}`,
  projectTraining: (projectId: string) => `/projects/train/${projectId}`,
  /** Without `itemId` the studio opens on the project itself (video clips). */
  studio: (projectId: string, itemId?: string) =>
    itemId
      ? `/projects/${projectId}/studio/${itemId}`
      : `/projects/${projectId}/studio`,
  aiModels: routePatterns.aiModels,
  datasetIntelligence: routePatterns.datasetIntelligence,
  labels: routePatterns.labels,
  settings: routePatterns.settings,
} as const

/** True when `pathname` is `href` or nested under it ("/" only matches itself). */
export const isPathActive = (pathname: string, href: string) =>
  pathname === href || (href !== "/" && pathname.startsWith(`${href}/`))
