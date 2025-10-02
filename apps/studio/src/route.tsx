import ImageStudio from "./pages/studio/page"
import Setting from "./pages/setting"
import Overview from "./pages/overview"
import NotFound from "./pages/not-found"
import UserPage from "./pages/user"
import PermissionsPage from "./pages/permissions"
import LoginPage from "./pages/login"
import LabelsPage from "./pages/labels"

import { HashRouter, Routes, Route } from "react-router-dom"
import MainLayout from "./components/main-layout"
import ProjectList from "./pages/projects/project-list"
import ProjectDetails from "./pages/projects/project-detail"
import { AutoUpdateBanner } from "./components/auto-update-banner"
import AIModelListPage from "./pages/ai-model"
import CloudStorageConfigPage from "./pages/clould-storage"
import TaskPage from "./pages/task"
import { ProjectCreate } from "./pages/projects/project-create"
import { AuthRoute } from "./guards/auth-guards"

const AppRoutes = () => {
  return (
    <HashRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes */}
        <Route
          element={
            <AuthRoute>
              <MainLayout />
            </AuthRoute>
          }
        >
          <Route path="/" element={<Overview />} />
          <Route path="/projects" element={<ProjectList />} />
          <Route path="/projects/create" element={<ProjectCreate />} />
          <Route
            path="/projects/detail/:projectId"
            element={<ProjectDetails />}
          />
          <Route path="/ai-models" element={<AIModelListPage />} />
          <Route path="/tasks" element={<TaskPage />} />
          <Route path="/labels" element={<LabelsPage />} />
          <Route path="/users" element={<UserPage />} />
          <Route path="/permissions" element={<PermissionsPage />} />
          <Route path="/cloud-storage" element={<CloudStorageConfigPage />} />
          <Route path="/settings" element={<Setting />} />
        </Route>

        {/* Studio route - requires authentication */}
        <Route
          path="/projects/:projectId/studio/:imageId"
          element={
            <AuthRoute>
              <ImageStudio />
            </AuthRoute>
          }
        />

        {/* Catch all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <AutoUpdateBanner />
    </HashRouter>
  )
}

export default AppRoutes
