import { routePatterns, type FeatureRoute } from "@/shared/lib/routes"

export const labelRoutes: FeatureRoute[] = [
  { path: routePatterns.labels, load: () => import("./routes/labels-page") },
]
