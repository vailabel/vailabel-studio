import { routePatterns, type FeatureRoute } from "@/shared/lib/routes"

export const trainingRoutes: FeatureRoute[] = [
  { path: routePatterns.projectTraining, load: () => import("./routes/training-page") },
]
