import { createBrowserRouter, RouterProvider } from "react-router-dom"
import ImageLabelingApp from "./pages/page"
import ProjectDetails from "./pages/projects/project-detail/page"
import ImageStudio from "./pages/studio/page"
import Setting from "./pages/setting"
import Overview from "./pages/overview"

const router = createBrowserRouter([
  {
    path: "/",
    element: <Overview />,
  },
  {
    path: "/projects",
    element: <ImageLabelingApp />,
  },
  {
    path: "/projects/:projectId",
    element: <ProjectDetails />,
  },
  {
    path: "/projects/:projectId/studio/:imageId",
    element: <ImageStudio />,
  },
  {
    path: "/settings",
    element: <Setting />,
  },
])

const Route = () => {
  return <RouterProvider router={router} />
}

export default Route
