import { routePatterns, type FeatureRoute } from "@/shared/lib/routes"

export const settingsRoutes: FeatureRoute[] = [
  { path: routePatterns.settings, load: () => import("./routes/settings-page") },
]
