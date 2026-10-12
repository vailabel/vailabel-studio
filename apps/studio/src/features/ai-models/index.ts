import { routePatterns, type FeatureRoute } from "@/shared/lib/routes"

export const aiModelRoutes: FeatureRoute[] = [
  { path: routePatterns.aiModels, load: () => import("./routes/ai-models-page") },
]
