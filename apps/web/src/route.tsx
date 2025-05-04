import { createBrowserRouter, RouterProvider } from "react-router-dom"
import ImageLabelingApp from "./pages/page"
import ProjectDetails from "./pages/projects/project-detail/page"
import ImageStudio from "./pages/studio/page"

const router = createBrowserRouter([
  {
    path: "/",
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
])

const Route = () => {
  return <RouterProvider router={router} />
}

export default Route
