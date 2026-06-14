import ImageStudio from "./pages/studio/page"
import Setting from "./pages/setting"
import Overview from "./pages/overview"
import NotFound from "./pages/not-found"
import LabelsPage from "./pages/labels"

import { HashRouter, Routes, Route } from "react-router-dom"
import MainLayout from "./components/layout/main-layout"
import ProjectList from "./pages/projects/project-list"
import ProjectDetails from "./pages/projects/project-detail"
import { AutoUpdateBanner } from "./components/layout/auto-update-banner"
import AIModelListPage from "./pages/ai-model"
import AiAssistantPage from "./pages/ai-assistant"
import CloudStorageConfigPage from "./pages/cloud-storage"
import TaskPage from "./pages/task"
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
          <Route path="/ai-assistant" element={<AiAssistantPage />} />
          <Route path="/tasks" element={<TaskPage />} />
          <Route path="/labels" element={<LabelsPage />} />
          <Route path="/cloud-storage" element={<CloudStorageConfigPage />} />
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
