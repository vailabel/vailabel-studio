import { routePatterns, type FeatureRoute } from "@/shared/lib/routes"

export const overviewRoutes: FeatureRoute[] = [
  { path: routePatterns.overview, load: () => import("./routes/overview-page") },
]
