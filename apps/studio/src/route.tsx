import ImageStudio from "./pages/studio/page"
import Setting from "./pages/setting"
import Overview from "./pages/overview"
import NotFound from "./pages/not-found"

import { HashRouter, Routes, Route } from "react-router-dom"
import MainLayout from "./components/main-layout"
import ProjectList from "./pages/projects/project-list"
import ProjectDetails from "./pages/projects/project-detail"
import { AutoUpdateBanner } from "./components/auto-update-banner"
import AIModelListPage from "./pages/ai-model"
import CloudStorageConfigPage from "./pages/clould-storage"
import TaskPage from "./pages/task"
import CreateTaskPage from "./pages/create-task"

const AppRoutes = () => {
  return (
    <HashRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Overview />} />
          <Route path="/projects" element={<ProjectList />} />
          <Route path="/projects/:projectId" element={<ProjectDetails />} />
          <Route path="/ai-models" element={<AIModelListPage />} />
          <Route path="/tasks" element={<TaskPage />} />
          <Route path="/tasks/create" element={<CreateTaskPage />} />
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
