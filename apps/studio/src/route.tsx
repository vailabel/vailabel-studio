import ImageStudio from "./pages/studio/page"
import Setting from "./pages/setting"
import Overview from "./pages/overview"
import NotFound from "./pages/not-found"
import LabelsPage from "./pages/labels"

import { HashRouter, Routes, Route, Navigate } from "react-router-dom"
import MainLayout from "./components/layout/main-layout"
import ProjectList from "./pages/projects/project-list"
import ProjectDetails from "./pages/projects/project-detail"
import { AutoUpdateBanner } from "./components/layout/auto-update-banner"
import AIModelListPage from "./pages/ai-model"
import DatasetIntelligence from "./pages/dataset-intelligence"
import VideoAnnotation from "./pages/video-annotation"
import { ProjectCreate } from "./pages/projects/project-create"

const AppRoutes = () => {
  return (
    <HashRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Overview />} />
          <Route path="/projects" element={<ProjectList />} />
          <Route path="/projects/create" element={<ProjectCreate />} />
          <Route
            path="/projects/detail/:projectId"
            element={<ProjectDetails />}
          />
          <Route path="/ai-models" element={<AIModelListPage />} />
          <Route
            path="/ai-assistant"
            element={<Navigate to="/ai-models" replace />}
          />
          <Route
            path="/dataset-intelligence"
            element={<DatasetIntelligence />}
          />
          <Route path="/video-annotation" element={<VideoAnnotation />} />
          <Route path="/labels" element={<LabelsPage />} />
          <Route
            path="/cloud-storage"
            element={<Navigate to="/settings" replace />}
          />
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
