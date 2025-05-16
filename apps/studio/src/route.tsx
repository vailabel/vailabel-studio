import ImageLabelingApp from "./pages/page"
import ProjectDetails from "./pages/projects/project-detail/page"
import ImageStudio from "./pages/studio/page"
import Setting from "./pages/setting"
import Overview from "./pages/overview"

import { HashRouter, Routes, Route } from "react-router-dom"
import { AutoUpdateBanner } from "./components/AutoUpdateBanner"

const AppRoutes = () => {
  return (
    <HashRouter>
      <AutoUpdateBanner />
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/projects" element={<ImageLabelingApp />} />
        <Route path="/projects/:projectId" element={<ProjectDetails />} />
        <Route
          path="/projects/:projectId/studio/:imageId"
          element={<ImageStudio />}
        />
        <Route path="/settings" element={<Setting />} />
      </Routes>
    </HashRouter>
  )
}

export default AppRoutes
