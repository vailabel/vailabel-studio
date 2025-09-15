import React from "react"
import { render, screen } from "@testing-library/react"
import { AnnotationRenderer } from "@/components/canvas/annotation-renderer"
import type { Annotation } from "@vailabel/core"

jest.mock("@/components/canvas/box-annotation", () => ({
  BoxAnnotation: ({ annotation }: { annotation: Annotation }) => (
    <div data-testid={`box-${annotation.id}`}>{annotation.name}</div>
  ),
}))

jest.mock("@/components/canvas/polygon-annotation", () => ({
  PolygonAnnotation: ({ annotation }: { annotation: Annotation }) => (
    <div data-testid={`poly-${annotation.id}`}>{annotation.name}</div>
  ),
}))

jest.mock("@/components/canvas/free-draw-annotation", () => ({
  FreeDrawAnnotation: ({ annotation }: { annotation: Annotation }) => (
    <div data-testid={`free-${annotation.id}`}>{annotation.name}</div>
  ),
}))

jest.mock("@/components/canvas/temp-annotation", () => ({
  TempAnnotation: ({ annotation }: { annotation: Partial<Annotation> }) => (
    <div data-testid={`temp-${annotation.type}`}>temp</div>
  ),
}))

describe("AnnotationRenderer", () => {
  test("renders known annotation types", () => {
    const anns: Annotation[] = [
      {
        id: "1",
        name: "B",
        type: "box",
        coordinates: [
          { x: 0, y: 0 },
          { x: 10, y: 10 },
        ],
      },
      {
        id: "2",
        name: "P",
        type: "polygon",
        coordinates: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 10, y: 10 },
        ],
      },
      {
        id: "3",
        name: "F",
        type: "freeDraw",
        coordinates: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ],
      },
    ]
    render(<AnnotationRenderer annotations={anns} />)
    expect(screen.getByTestId("box-1")).toBeInTheDocument()
    expect(screen.getByTestId("poly-2")).toBeInTheDocument()
    expect(screen.getByTestId("free-3")).toBeInTheDocument()
  })

  test("skips invalid annotations and renders temp when isTemporary", () => {
    const anns: Partial<Annotation>[] = [
      { type: "box", coordinates: [] },
      { type: "polygon", coordinates: [{ x: 1, y: 1 }] as any },
      { type: "freeDraw", coordinates: [{ x: 0, y: 0 }, { x: 1, y: 1 }] },
    ]
    render(<AnnotationRenderer annotations={anns} isTemporary />)
    expect(screen.getByTestId("temp-freeDraw")).toBeInTheDocument()
  })
})

