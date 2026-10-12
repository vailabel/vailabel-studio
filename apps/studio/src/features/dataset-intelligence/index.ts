import { routePatterns, type FeatureRoute } from "@/shared/lib/routes"

export const datasetIntelligenceRoutes: FeatureRoute[] = [
  { path: routePatterns.datasetIntelligence, load: () => import("./routes/dataset-intelligence-page") },
]
