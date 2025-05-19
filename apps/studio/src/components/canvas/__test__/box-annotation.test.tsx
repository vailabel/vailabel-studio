import { render, waitFor } from "@testing-library/react"
import { BoxAnnotation } from "../box-annotation"
import { CanvasProvider } from "@/contexts/canvas-context-provider"
import { AnnotationsProvider } from "@/contexts/annotations-context-provider"
import { createMockDataAccess } from "@/contexts/__mocks__/mock-data-access"
import { DataAccessContext } from "@/contexts/data-access-context"
import type { Annotation, Label } from "@vailabel/core"

function MockProviders({
  children,
  annotations,
  labels,
}: Readonly<{
  children: React.ReactNode
  annotations: Annotation[]
  labels: Label[]
}>) {
  const mockDataAccess = createMockDataAccess({ annotations, labels })
  return (
    <DataAccessContext.Provider value={{ dataAccess: mockDataAccess }}>
      <CanvasProvider>
        <AnnotationsProvider>{children}</AnnotationsProvider>
      </CanvasProvider>
    </DataAccessContext.Provider>
  )
}

describe("BoxAnnotation", () => {
  it("renders box annotation with label and correct styles", async () => {
    const annotation: import("@vailabel/core").Annotation = {
      id: "1",
      labelId: "label-1",
      name: "Box 1",
      type: "box",
      coordinates: [
        { x: 10, y: 20 },
        { x: 110, y: 120 },
      ],
      imageId: "img-1",
      createdAt: new Date(),
      updatedAt: new Date(),
      color: "blue",
    }
    await waitFor(() => {
      render(
        <MockProviders annotations={[annotation]} labels={[]}>
          <BoxAnnotation annotation={annotation} />
        </MockProviders>
      )
    })
  })
})
