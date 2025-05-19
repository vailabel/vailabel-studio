import "@testing-library/jest-dom"
import { render, screen, waitFor } from "@testing-library/react"
import { AnnotationRenderer } from "../annotation-renderer"
import { CanvasProvider } from "@/contexts/canvas-context-provider"
import { AnnotationsProvider } from "@/contexts/annotations-context-provider"
import { createMockDataAccess } from "@/contexts/mock-data-access"
import { DataAccessContext } from "@/contexts/data-access-context"
import type { Annotation, Label } from "@vailabel/core"

const boxAnnotation: Annotation = {
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

const polygonAnnotation: Annotation = {
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

const boxLabel: Label = {
  id: "label-1",
  name: "Box Label",
  color: "blue",
  createdAt: new Date(),
  updatedAt: new Date(),
} as Label
const polygonLabel: Label = {
  id: "label-2",
  name: "Polygon Label",
  color: "green",
  createdAt: new Date(),
  updatedAt: new Date(),
} as Label

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

// Mock ResizeObserver if not present (for JSDOM)
beforeAll(() => {
  if (!window.ResizeObserver) {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as any
  }
})

describe("AnnotationRenderer", () => {
  it("renders box and polygon annotations", async () => {
    render(
      <MockProviders
        annotations={[boxAnnotation, polygonAnnotation]}
        labels={[boxLabel, polygonLabel]}
      >
        <AnnotationRenderer annotations={[boxAnnotation, polygonAnnotation]} />
      </MockProviders>
    )
    await waitFor(() => {
      expect(screen.getByText("Box 1")).toBeInTheDocument()
      expect(screen.getByText("Polygon 1")).toBeInTheDocument()
    })
  })

  it("renders nothing for unsupported annotation type", async () => {
    const freeDrawAnnotation: Annotation = {
      ...boxAnnotation,
      id: "3",
      type: "freeDraw",
      name: "FreeDraw 1",
    }
    render(
      <MockProviders annotations={[freeDrawAnnotation]} labels={[boxLabel]}>
        <AnnotationRenderer annotations={[freeDrawAnnotation]} />
      </MockProviders>
    )
    await waitFor(() => {
      expect(screen.queryByText("FreeDraw 1")).not.toBeInTheDocument()
    })
  })
})
