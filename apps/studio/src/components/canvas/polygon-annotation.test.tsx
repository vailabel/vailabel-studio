import { render, waitFor } from "@testing-library/react"
import { PolygonAnnotation } from "./polygon-annotation"
import { CanvasProvider } from "@/contexts/canvas-context-provider"
import { AnnotationsProvider } from "@/contexts/annotations-context-provider"
import { createMockDataAccess } from "@/contexts/mock-data-access"
import { DataAccessContext } from "@/contexts/data-access-context"
import type { Annotation, Label } from "@vailabel/core"

function MockProviders({
  children,
  annotations,
  labels,
}: {
  children: React.ReactNode
  annotations: Annotation[]
  labels: Label[]
}) {
  const mockDataAccess = createMockDataAccess({ annotations, labels })
  return (
    <DataAccessContext.Provider value={{ dataAccess: mockDataAccess }}>
      <CanvasProvider>
        <AnnotationsProvider>{children}</AnnotationsProvider>
      </CanvasProvider>
    </DataAccessContext.Provider>
  )
}

describe("PolygonAnnotation", () => {
  it("renders polygon annotation with label and correct points", async () => {
    const annotation: Annotation = {
      id: "2",
      labelId: "label-2",
      name: "Polygon 1",
      type: "polygon",
      coordinates: [
        { x: 30, y: 40 },
        { x: 50, y: 60 },
        { x: 70, y: 80 },
      ],
      imageId: "img-1",
      createdAt: new Date(),
      updatedAt: new Date(),
      color: "green",
    }
    await waitFor(() => {
      render(
        <MockProviders annotations={[annotation]} labels={[]}>
          <PolygonAnnotation annotation={annotation} />
        </MockProviders>
      )
    })
  })
})
