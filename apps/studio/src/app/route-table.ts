import { lazy, type ComponentType, type LazyExoticComponent } from "react"
import { aiModelRoutes } from "@/features/ai-models"
import { datasetIntelligenceRoutes } from "@/features/dataset-intelligence"
import { labelRoutes } from "@/features/labels"
import { overviewRoutes } from "@/features/overview"
import { projectRoutes } from "@/features/projects"
import { settingsRoutes } from "@/features/settings"
import { studioRoutes } from "@/features/studio"
import { trainingRoutes } from "@/features/training"
import { paths, type FeatureRoute } from "@/shared/lib/routes"

// Adding a feature to the app = adding its routes here. Nothing else in the
// router changes.
const featureRoutes: FeatureRoute[] = [
  ...overviewRoutes,
  ...projectRoutes,
  ...trainingRoutes,
  ...aiModelRoutes,
  ...datasetIntelligenceRoutes,
  ...labelRoutes,
  ...settingsRoutes,
  ...studioRoutes,
]

type Page = LazyExoticComponent<ComponentType>

// One lazy component per loader: routes that share a page (studio with and
// without an item) keep its state when the URL moves between them.
const pages = new Map<FeatureRoute["load"], Page>()
const pageFor = (load: FeatureRoute["load"]) => {
  let page = pages.get(load)
  if (!page) {
    page = lazy(load)
    pages.set(load, page)
  }
  return page
}

const toAppRoute = ({ path, load }: FeatureRoute) => ({
  path,
  Page: pageFor(load),
})

/** Routes rendered inside the sidebar layout. */
export const shellRoutes = featureRoutes
  .filter((route) => route.layout !== "bare")
  .map(toAppRoute)

/** Routes that own the whole window. */
export const bareRoutes = featureRoutes
  .filter((route) => route.layout === "bare")
  .map(toAppRoute)

/** Old URLs kept alive for bookmarks and in-app links from earlier versions. */
export const redirects = [
  { from: "/ai-assistant", to: paths.aiModels },
  { from: "/cloud-storage", to: paths.settings },
]

/**
 * Start downloading a page's chunk before navigation (hover / focus on a nav
 * item). Safe to call repeatedly — the module loader dedupes.
 */
export const preloadRoute = (path: string) => {
  void featureRoutes
    .find((route) => route.path === path)
    ?.load()
    .catch(() => {
      // A failed preload is retried by the real navigation.
    })
}
