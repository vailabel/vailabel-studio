import { routePatterns, type FeatureRoute } from "@/shared/lib/routes"

export const projectRoutes: FeatureRoute[] = [
  {
    path: routePatterns.projects,
    load: () => import("./routes/project-list"),
  },
  {
    path: routePatterns.projectCreate,
    load: () => import("./routes/project-create"),
  },
  {
    path: routePatterns.projectDetail,
    load: () => import("./routes/project-detail"),
  },
]
