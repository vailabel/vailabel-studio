import ImageStudio from "./pages/studio/page"
import Setting from "./pages/setting"
import Overview from "./pages/overview"
import NotFound from "./pages/not-found"
import UserPage from "./pages/user"
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
        <Route element={<MainLayout />}>
          <Route
            path="/"
            element={
              <AuthRoute>
                <Overview />
              </AuthRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <AuthRoute>
                <ProjectList />
              </AuthRoute>
            }
          />
          <Route
            path="/projects/create"
            element={
              <AuthRoute requiredPermission="projects:write">
                <ProjectCreate />
              </AuthRoute>
            }
          />
          <Route
            path="/projects/detail/:projectId"
            element={
              <AuthRoute>
                <ProjectDetails />
              </AuthRoute>
            }
          />
          <Route
            path="/ai-models"
            element={
              <AuthRoute requiredPermission="ai_models:read">
                <AIModelListPage />
              </AuthRoute>
            }
          />
          <Route
            path="/tasks"
            element={
              <AuthRoute>
                <TaskPage />
              </AuthRoute>
            }
          />
          <Route
            path="/labels"
            element={
              <AuthRoute>
                <LabelsPage />
              </AuthRoute>
            }
          />
          <Route
            path="/users"
            element={
              <AuthRoute requiredRoles={["admin", "manager"]}>
                <UserPage />
              </AuthRoute>
            }
          />
          <Route
            path="/cloud-storage"
            element={
              <AuthRoute requiredPermission="settings:write">
                <CloudStorageConfigPage />
              </AuthRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <AuthRoute>
                <Setting />
              </AuthRoute>
            }
          />
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
