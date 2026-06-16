import { lazy, Suspense, type ReactNode } from "react"
import { HashRouter, Routes, Route, Navigate } from "react-router-dom"
import MainLayout from "@/app/layout/main-layout"
import { AutoUpdateBanner } from "@/app/layout/auto-update-banner"
import { RouteFallback } from "./route-fallback"

// Lazy page chunks keep the heavy studio/editor/canvas bundle off the cold-start
// path (the blank-splash fix). Each routed element is wrapped in <Suspense> so
// only the content area — rendered inside the layout's <Outlet/> — shows the
// fallback while a chunk downloads; the sidebar/header chrome stays put.
const Overview = lazy(() => import("@/features/overview"))
const ProjectList = lazy(() => import("@/features/projects/routes/project-list"))
const ProjectCreate = lazy(() =>
  import("@/features/projects/routes/project-create").then((m) => ({
    default: m.ProjectCreate,
  }))
)
const ProjectDetails = lazy(() => import("@/features/projects/routes/project-detail"))
const AIModelListPage = lazy(() => import("@/features/ai-models"))
const DatasetIntelligence = lazy(() => import("@/features/dataset-intelligence"))
const LabelsPage = lazy(() => import("@/features/labels"))
const Setting = lazy(() => import("@/features/settings"))
const ImageStudio = lazy(() => import("@/features/studio"))
const NotFound = lazy(() => import("@/app/not-found"))

const withSuspense = (node: ReactNode) => (
  <Suspense fallback={<RouteFallback />}>{node}</Suspense>
)

const AppRoutes = () => {
  return (
    <HashRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={withSuspense(<Overview />)} />
          <Route path="/projects" element={withSuspense(<ProjectList />)} />
          <Route
            path="/projects/create"
            element={withSuspense(<ProjectCreate />)}
          />
          <Route
            path="/projects/detail/:projectId"
            element={withSuspense(<ProjectDetails />)}
          />
          <Route path="/ai-models" element={withSuspense(<AIModelListPage />)} />
          <Route
            path="/ai-assistant"
            element={<Navigate to="/ai-models" replace />}
          />
          <Route
            path="/dataset-intelligence"
            element={withSuspense(<DatasetIntelligence />)}
          />
          <Route path="/labels" element={withSuspense(<LabelsPage />)} />
          <Route
            path="/cloud-storage"
            element={<Navigate to="/settings" replace />}
          />
          <Route path="/settings" element={withSuspense(<Setting />)} />
        </Route>

        {/* Param-less variant for projects whose items are imported inside the
            editor (video clips); `imageId` is undefined, which the shell tolerates. */}
        <Route
          path="/projects/:projectId/studio"
          element={withSuspense(<ImageStudio />)}
        />
        <Route
          path="/projects/:projectId/studio/:imageId"
          element={withSuspense(<ImageStudio />)}
        />

        <Route path="*" element={withSuspense(<NotFound />)} />
      </Routes>
      <AutoUpdateBanner />
    </HashRouter>
  )
}

export default AppRoutes
