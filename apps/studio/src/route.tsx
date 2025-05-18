import ImageStudio from "./pages/studio/page"
import Setting from "./pages/setting"
import Overview from "./pages/overview"
import NotFound from "./pages/not-found"

import { HashRouter, Routes, Route } from "react-router-dom"
import MainLayout from "./components/main-layout"
import ProjectList from "./pages/projects/project-list"
import ProjectDetails from "./pages/projects/project-detail"
import { AutoUpdateBanner } from "./components/auto-update-banner"

const AppRoutes = () => {
  return (
    <HashRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Overview />} />
          <Route path="/projects" element={<ProjectList />} />
          <Route path="/projects/:projectId" element={<ProjectDetails />} />
          <Route path="/settings" element={<Setting />} />
        </Route>
        <Route
          path="/projects/:projectId/studio/:imageId"
          element={<ImageStudio />}
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <AutoUpdateBanner />
    </HashRouter>
  )
}

export default AppRoutes
