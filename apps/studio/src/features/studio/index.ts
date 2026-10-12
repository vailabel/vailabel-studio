import { routePatterns, type FeatureRoute } from "@/shared/lib/routes"

// The editor owns the whole window (no sidebar). The item-less variant is for
// projects whose items are imported inside the editor (video clips).
const load = () => import("./routes/studio-page")

export const studioRoutes: FeatureRoute[] = [
  { path: routePatterns.studio, load, layout: "bare" },
  { path: routePatterns.studioItem, load, layout: "bare" },
]
