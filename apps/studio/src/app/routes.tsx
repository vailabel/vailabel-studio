import { lazy, Suspense, type ReactNode } from "react"
import { HashRouter, Routes, Route, Navigate } from "react-router-dom"
import MainLayout from "@/app/layout/main-layout"
import { AutoUpdateBanner } from "@/app/layout/auto-update-banner"
import { UpdateProvider } from "@/shared/ipc/update-context"
import { RouteFallback } from "./route-fallback"
import { bareRoutes, redirects, shellRoutes } from "./route-table"

const NotFound = lazy(() => import("@/app/not-found"))

// Each routed element gets its own <Suspense> so only the content area —
// rendered inside the layout's <Outlet/> — shows the fallback while a page
// chunk downloads; the sidebar/header chrome stays put.
const withSuspense = (node: ReactNode) => (
  <Suspense fallback={<RouteFallback />}>{node}</Suspense>
)

const AppRoutes = () => {
  return (
    <HashRouter>
      <UpdateProvider>
        <Routes>
          <Route element={<MainLayout />}>
            {shellRoutes.map(({ path, Page }) => (
              <Route key={path} path={path} element={withSuspense(<Page />)} />
            ))}
            {redirects.map(({ from, to }) => (
              <Route
                key={from}
                path={from}
                element={<Navigate to={to} replace />}
              />
            ))}
          </Route>

          {bareRoutes.map(({ path, Page }) => (
            <Route key={path} path={path} element={withSuspense(<Page />)} />
          ))}

          <Route path="*" element={withSuspense(<NotFound />)} />
        </Routes>
        <AutoUpdateBanner />
      </UpdateProvider>
    </HashRouter>
  )
}

export default AppRoutes
